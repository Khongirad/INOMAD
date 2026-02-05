import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, ApplicationStatus, AccessRole } from '@prisma/client-migration';

@Injectable()
export class PassportApplicationService {
  constructor(
    @Inject('MIGRATION_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Create a new passport application
   */
  async createApplication(data: {
    userId: string;
    fullName: string;
    dateOfBirth: Date;
    placeOfBirth: string;
    nationality?: string;
    biography: string;
    currentAddress: string;
    email?: string;
    phone?: string;
  }) {
    return this.prisma.passportApplication.create({
      data: {
        ...data,
        status: ApplicationStatus.DRAFT,
      },
    });
  }

  /**
   * Submit application for review
   */
  async submitApplication(applicationId: string, userId: string) {
    const application = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('Not your application');
    }

    return this.prisma.passportApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.SUBMITTED },
    });
  }

  /**
   * Get application with access control
   */
  async getApplication(
    applicationId: string,
    requesterId: string,
    requesterRole: AccessRole,
    warrantId?: string,
  ) {
    const application = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
      include: {
        documents: (requesterRole === AccessRole.MIGRATION_OFFICER || !!warrantId) ? true : false,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Log access
    await this.logAccess({
      accessorId: requesterId,
      accessorRole: requesterRole,
      applicationId,
      action: requesterRole === AccessRole.MIGRATION_OFFICER ? 'VIEW_FULL' : 'VIEW_LIMITED',
      warrantId,
    });

    // Filter data based on role
    if (requesterRole === AccessRole.LAW_ENFORCEMENT && !warrantId) {
      // Limited access: only basic info
      return {
        id: application.id,
        fullName: application.fullName,
        passportNumber: application.passportNumber,
        currentAddress: application.currentAddress,
        // NO biography, NO documents
      };
    }

    // Full access for migration officers or with warrant
    return application;
  }

  /**
   * Get application by user ID
   */
  async getApplicationByUserId(userId: string) {
    return this.prisma.passportApplication.findUnique({
      where: { userId },
      include: { documents: true },
    });
  }

  /**
   * Review application (migration officer only)
   */
  async reviewApplication(
    applicationId: string,
    officerId: string,
    decision: 'approve' | 'reject',
    rejectionReason?: string,
  ) {
    const application = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (decision === 'approve') {
      // Generate passport number
      const passportNumber = await this.generatePassportNumber();

      return this.prisma.passportApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.APPROVED,
          reviewedBy: officerId,
          reviewedAt: new Date(),
          passportNumber,
          issueDate: new Date(),
          expiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
        },
      });
    } else {
      return this.prisma.passportApplication.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.REJECTED,
          reviewedBy: officerId,
          reviewedAt: new Date(),
          rejectionReason,
        },
      });
    }
  }

  /**
   * Get all pending applications (migration officer only)
   */
  async getPendingApplications() {
    return this.prisma.passportApplication.findMany({
      where: {
        status: {
          in: [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Lookup by passport number (law enforcement with limited data)
   */
  async lookupByPassportNumber(
    passportNumber: string,
    requesterId: string,
    requesterRole: AccessRole,
  ) {
    const application = await this.prisma.passportApplication.findUnique({
      where: { passportNumber },
    });

    if (!application) {
      throw new NotFoundException('Passport not found');
    }

    // Log access
    await this.logAccess({
      accessorId: requesterId,
      accessorRole: requesterRole,
      applicationId: application.id,
      action: 'VIEW_LIMITED',
    });

    // Limited data for law enforcement
    if (requesterRole === AccessRole.LAW_ENFORCEMENT) {
      return {
        fullName: application.fullName,
        passportNumber: application.passportNumber,
        currentAddress: application.currentAddress,
      };
    }

    return application;
  }

  /**
   * Generate unique passport number
   */
  private async generatePassportNumber(): Promise<string> {
    // Format: SC-YYYYMMDD-XXXX (SC = Siberian Confederation)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of passports issued today
    const count = await this.prisma.passportApplication.count({
      where: {
        issueDate: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
          lt: new Date(date.setHours(23, 59, 59, 999)),
        },
      },
    });

    const sequential = String(count + 1).padStart(4, '0');
    return `SC-${dateStr}-${sequential}`;
  }

  /**
   * Log access for audit trail
   */
  private async logAccess(data: {
    accessorId: string;
    accessorRole: AccessRole;
    applicationId: string;
    action: string;
    warrantId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.accessLog.create({
      data: {
        ...data,
        accessedFields: this.getAccessedFields(data.accessorRole),
      },
    });
  }

  /**
   * Determine which fields were accessed based on role
   */
  private getAccessedFields(role: AccessRole): string[] {
    switch (role) {
      case AccessRole.MIGRATION_OFFICER:
      case AccessRole.COURT_WARRANT:
        return ['fullName', 'biography', 'documents', 'currentAddress', 'passportNumber'];
      case AccessRole.LAW_ENFORCEMENT:
        return ['fullName', 'currentAddress', 'passportNumber'];
      case AccessRole.APPLICANT:
        return ['fullName', 'biography', 'documents', 'currentAddress'];
      default:
        return [];
    }
  }
}
