import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient, AccessRole } from '@prisma/client-migration';

@Injectable()
export class AccessControlService {
  constructor(
    @Inject('MIGRATION_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Check if user has access to application
   */
  async checkAccess(
    userId: string,
    applicationId: string,
    role: AccessRole,
  ): Promise<{ hasAccess: boolean; reason?: string }> {
    const application = await this.prisma.passportApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return { hasAccess: false, reason: 'Application not found' };
    }

    // Applicant can access own data
    if (role === AccessRole.APPLICANT && application.userId === userId) {
      return { hasAccess: true };
    }

    // Migration officers have full access
    if (role === AccessRole.MIGRATION_OFFICER) {
      return { hasAccess: true };
    }

    // Law enforcement needs warrant for full access
    if (role === AccessRole.LAW_ENFORCEMENT) {
      const activeWarrant = await this.prisma.warrant.findFirst({
        where: {
          targetUserId: application.userId,
          status: 'APPROVED',
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
        },
      });

      if (activeWarrant) {
        return { hasAccess: true };
      }

      // Can still do limited lookup without warrant
      return { hasAccess: true, reason: 'LIMITED_ACCESS' };
    }

    return { hasAccess: false, reason: 'Insufficient permissions' };
  }

  /**
   * Get user role (simplified - should integrate with main auth system)
   */
  async getUserRole(userId: string): Promise<AccessRole> {
    // TODO: Integrate with main user system to get actual roles
    // For now, defaulting to APPLICANT
    return AccessRole.APPLICANT;
  }
}
