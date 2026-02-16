import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MigrationServiceService {
  constructor(private prisma: PrismaService) {}

  async createApplication(userId: string, data: {
    fullName: string;
    dateOfBirth: string;
    placeOfBirth: string;
    nationality: string;
    sex: string;
    height?: number;
    eyeColor?: string;
    fatherName?: string;
    motherName?: string;
    address: string;
    city: string;
    region: string;
    postalCode?: string;
    passportType?: 'STANDARD' | 'DIPLOMATIC' | 'SERVICE';
    previousPassportNumber?: string;
  }) {
    return this.prisma.passportApplication.create({
      data: {
        applicant: { connect: { id: userId } },
        fullName: data.fullName,
        dateOfBirth: new Date(data.dateOfBirth),
        placeOfBirth: data.placeOfBirth,
        nationality: data.nationality,
        sex: data.sex,
        height: data.height,
        eyeColor: data.eyeColor,
        fatherName: data.fatherName,
        motherName: data.motherName,
        address: data.address,
        city: data.city,
        region: data.region,
        postalCode: data.postalCode,
        passportType: data.passportType || 'STANDARD',
        previousPassportNumber: data.previousPassportNumber,
        status: 'DRAFT',
      },
      include: { documents: true },
    });
  }

  async submitApplication(userId: string, applicationId: string) {
    const app = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
    });

    if (!app) throw new NotFoundException('Application not found');
    if (app.applicantId !== userId) throw new ForbiddenException('Not your application');
    if (app.status !== 'DRAFT') throw new BadRequestException('Application already submitted');

    return this.prisma.passportApplication.update({
      where: { id: applicationId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { documents: true },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.passportApplication.findMany({
      where: { applicantId: userId },
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationById(applicationId: string) {
    const app = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
      include: { documents: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async getDocuments(applicationId: string) {
    return this.prisma.passportDocument.findMany({
      where: { applicationId },
    });
  }

  async uploadDocument(applicationId: string, data: {
    type: 'PHOTO' | 'SIGNATURE' | 'BIRTH_CERTIFICATE' | 'OTHER';
    filename: string;
    mimeType: string;
    size: number;
    storagePath: string;
  }) {
    const app = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException('Application not found');

    return this.prisma.passportDocument.create({
      data: {
        applicationId,
        type: data.type,
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        storagePath: data.storagePath,
      },
    });
  }

  async lookupPassport(passportNumber: string) {
    const app = await this.prisma.passportApplication.findFirst({
      where: {
        issuedPassportNumber: passportNumber,
        status: 'ISSUED',
      },
    });

    if (!app) {
      return { exists: false };
    }

    return {
      exists: true,
      passportNumber: app.issuedPassportNumber,
      fullName: app.fullName,
      isValid: app.expiresAt ? new Date(app.expiresAt) > new Date() : true,
      expiresAt: app.expiresAt,
    };
  }

  // Officer functions
  async getAllApplications() {
    return this.prisma.passportApplication.findMany({
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingApplications() {
    return this.prisma.passportApplication.findMany({
      where: {
        status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
      },
      include: { documents: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewApplication(applicationId: string, reviewerId: string, data: {
    decision: 'APPROVE' | 'REJECT';
    notes?: string;
    passportNumber?: string;
  }) {
    const app = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(app.status)) {
      throw new BadRequestException('Application not in reviewable state');
    }

    if (data.decision === 'APPROVE') {
      const passportNumber = data.passportNumber ||
        `SC-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);

      return this.prisma.passportApplication.update({
        where: { id: applicationId },
        data: {
          status: 'ISSUED',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          reviewNotes: data.notes,
          issuedPassportNumber: passportNumber,
          issuedAt: new Date(),
          expiresAt,
        },
        include: { documents: true },
      });
    } else {
      return this.prisma.passportApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          reviewNotes: data.notes,
        },
        include: { documents: true },
      });
    }
  }
}
