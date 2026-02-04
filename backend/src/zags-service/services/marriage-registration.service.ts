import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient, MarriageStatus, ConsentStatus } from '@prisma/client-zags';

@Injectable()
export class MarriageRegistrationService {
  constructor(
    @Inject('ZAGS_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Create marriage application
   */
  async createMarriageApplication(data: {
    spouse1Id: string;
    spouse2Id: string;
    spouse1FullName: string;
    spouse2FullName: string;
    spouse1DateOfBirth: Date;
    spouse2DateOfBirth: Date;
    marriageDate: Date;
    ceremonyLocation?: string;
    ceremonyType?: string;
    propertyRegime?: string;
  }) {
    // Check if either party is already married
    const existingMarriage1 = await this.getActiveMarriage(data.spouse1Id);
    const existingMarriage2 = await this.getActiveMarriage(data.spouse2Id);

    if (existingMarriage1) {
      throw new BadRequestException('Spouse 1 is already married');
    }
    if (existingMarriage2) {
      throw new BadRequestException('Spouse 2 is already married');
    }

    // Generate certificate number
    const certificateNumber = await this.generateCertificateNumber();

    // Create marriage record
    const marriage = await this.prisma.marriage.create({
      data: {
        ...data,
        certificateNumber,
        status: MarriageStatus.PENDING_CONSENT,
        isPublic: true,
      },
    });

    // Create consent requests for both parties
    await this.prisma.marriageConsent.createMany({
      data: [
        {
          marriageId: marriage.id,
          userId: data.spouse1Id,
          status: ConsentStatus.PENDING,
        },
        {
          marriageId: marriage.id,
          userId: data.spouse2Id,
          status: ConsentStatus.PENDING,
        },
      ],
    });

    return marriage;
  }

  /**
   * Provide consent for marriage
   */
  async provideConsent(data: {
    marriageId: string;
    userId: string;
    signature: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: data.marriageId },
      include: { consents: true },
    });

    if (!marriage) {
      throw new NotFoundException('Marriage application not found');
    }

    // Verify user is one of the parties
    if (marriage.spouse1Id !== data.userId && marriage.spouse2Id !== data.userId) {
      throw new BadRequestException('You are not a party to this marriage');
    }

    // Update consent
    const consent = await this.prisma.marriageConsent.updateMany({
      where: {
        marriageId: data.marriageId,
        userId: data.userId,
        status: ConsentStatus.PENDING,
      },
      data: {
        status: ConsentStatus.APPROVED,
        consentedAt: new Date(),
        signature: data.signature,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    // Check if both parties have consented
    const allConsents = await this.prisma.marriageConsent.findMany({
      where: { marriageId: data.marriageId },
    });

    const allApproved = allConsents.every(c => c.status === ConsentStatus.APPROVED);

    if (allApproved) {
      // Both parties consented, move to pending review
      await this.prisma.marriage.update({
        where: { id: data.marriageId },
        data: { status: MarriageStatus.PENDING_REVIEW },
      });
    }

    return consent;
  }

  /**
   * Register marriage (ZAGS officer)
   */
  async registerMarriage(data: {
    marriageId: string;
    officerId: string;
  }) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: data.marriageId },
      include: { consents: true },
    });

    if (!marriage) {
      throw new NotFoundException('Marriage not found');
    }

    // Verify both parties have consented
    const allConsented = marriage.consents.every(
      c => c.status === ConsentStatus.APPROVED
    );

    if (!allConsented) {
      throw new BadRequestException('Both parties must consent before registration');
    }

    // Register marriage
    return this.prisma.marriage.update({
      where: { id: data.marriageId },
      data: {
        status: MarriageStatus.REGISTERED,
        registeredBy: data.officerId,
        registeredAt: new Date(),
      },
    });
  }

  /**
   * Get marriage by certificate number
   */
  async getMarriageByCertificate(certificateNumber: string) {
    return this.prisma.marriage.findUnique({
      where: { certificateNumber },
      include: { consents: true },
    });
  }

  /**
   * Get active marriage for a user
   */
  async getActiveMarriage(userId: string) {
    return this.prisma.marriage.findFirst({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
        status: MarriageStatus.REGISTERED,
      },
    });
  }

  /**
   * Get marriage applications by user
   */
  async getMarriagesByUser(userId: string) {
    return this.prisma.marriage.findMany({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
      },
      include: { consents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending marriages (ZAGS officer)
   */
  async getPendingMarriages() {
    return this.prisma.marriage.findMany({
      where: {
        status: {
          in: [MarriageStatus.PENDING_REVIEW, MarriageStatus.APPROVED],
        },
      },
      include: { consents: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * File for divorce
   */
  async fileDivorce(data: {
    marriageId: string;
    initiatedBy: string;
    reason: string;
  }) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: data.marriageId },
    });

    if (!marriage) {
      throw new NotFoundException('Marriage not found');
    }

    if (marriage.status !== MarriageStatus.REGISTERED) {
      throw new BadRequestException('Can only divorce registered marriages');
    }

    // Verify initiator is one of the parties
    if (marriage.spouse1Id !== data.initiatedBy && marriage.spouse2Id !== data.initiatedBy) {
      throw new BadRequestException('You are not a party to this marriage');
    }

    // Generate divorce certificate number
    const divorceCertificateNumber = await this.generateDivorceCertificateNumber();

    return this.prisma.divorce.create({
      data: {
        marriageId: data.marriageId,
        initiatedBy: data.initiatedBy,
        reason: data.reason,
        divorceCertificateNumber,
      },
    });
  }

  /**
   * Finalize divorce (ZAGS officer)
   */
  async finalizeDivorce(data: {
    divorceId: string;
    officerId: string;
  }) {
    const divorce = await this.prisma.divorce.findUnique({
      where: { id: data.divorceId },
      include: { marriage: true },
    });

    if (!divorce) {
      throw new NotFoundException('Divorce record not found');
    }

    // Update divorce status
    await this.prisma.divorce.update({
      where: { id: data.divorceId },
      data: {
        status: 'FINALIZED',
        finalizedDate: new Date(),
        finalizedBy: data.officerId,
      },
    });

    // Note: We don't delete marriage record, just mark it as divorced
    // The marriage history is preserved for legal purposes
    
    return divorce;
  }

  /**
   * Generate unique certificate number
   */
  private async generateCertificateNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await this.prisma.marriage.count({
      where: {
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
        },
      },
    });

    const sequential = String(count + 1).padStart(5, '0');
    return `MAR-${dateStr}-${sequential}`;
  }

  /**
   * Generate unique divorce certificate number
   */
  private async generateDivorceCertificateNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await this.prisma.divorce.count({
      where: {
        createdAt: {
          gte: new Date(date.setHours(0, 0, 0, 0)),
        },
      },
    });

    const sequential = String(count + 1).padStart(5, '0');
    return `DIV-${dateStr}-${sequential}`;
  }
}
