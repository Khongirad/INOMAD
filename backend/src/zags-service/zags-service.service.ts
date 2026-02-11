import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZagsServiceService {
  constructor(private prisma: PrismaService) {}

  async checkEligibility(userId: string) {
    // Check if user has active marriage
    const activeMarriage = await this.prisma.marriage.findFirst({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
        status: 'REGISTERED',
      },
    });

    // Check for pending divorce
    const pendingDivorce = activeMarriage
      ? await this.prisma.zagsDivorce.findFirst({
          where: {
            marriageId: activeMarriage.id,
            status: { in: ['FILED', 'UNDER_REVIEW'] },
          },
        })
      : null;

    const currentStatus = activeMarriage ? 'MARRIED' : 'SINGLE';
    const isEligible = !activeMarriage;
    const reasons: string[] = [];

    if (activeMarriage) {
      reasons.push('Already married');
      if (pendingDivorce) {
        reasons.push('Divorce proceedings in progress');
      }
    }

    return { isEligible, currentStatus, reasons };
  }

  async createMarriageApplication(userId: string, data: {
    partnerId: string;
    spouse1FullName: string;
    spouse2FullName: string;
    spouse1DateOfBirth: string;
    spouse2DateOfBirth: string;
    marriageDate: string;
    ceremonyLocation?: string;
    ceremonyType?: 'Civil' | 'Religious' | 'Traditional';
    witness1Name?: string;
    witness2Name?: string;
    witness1Id?: string;
    witness2Id?: string;
    propertyRegime?: 'SEPARATE' | 'JOINT' | 'CUSTOM';
    propertyAgreement?: string;
  }) {
    const ceremonyMap: Record<string, any> = {
      'Civil': 'CIVIL',
      'Religious': 'RELIGIOUS',
      'Traditional': 'TRADITIONAL',
    };

    const marriage = await this.prisma.marriage.create({
      data: {
        spouse1Id: userId,
        spouse2Id: data.partnerId,
        spouse1FullName: data.spouse1FullName,
        spouse2FullName: data.spouse2FullName,
        spouse1DateOfBirth: new Date(data.spouse1DateOfBirth),
        spouse2DateOfBirth: new Date(data.spouse2DateOfBirth),
        marriageDate: new Date(data.marriageDate),
        ceremonyLocation: data.ceremonyLocation,
        ceremonyType: data.ceremonyType ? ceremonyMap[data.ceremonyType] : null,
        witness1Name: data.witness1Name,
        witness2Name: data.witness2Name,
        witness1Id: data.witness1Id,
        witness2Id: data.witness2Id,
        propertyRegime: data.propertyRegime,
        propertyAgreement: data.propertyAgreement,
        status: 'PENDING_CONSENT',
        // Auto-grant consent for the initiator
        spouse1ConsentGranted: true,
        spouse1ConsentedAt: new Date(),
      },
    });

    // Create consent records for both spouses
    await this.prisma.marriageConsent.createMany({
      data: [
        { marriageId: marriage.id, userId, status: 'APPROVED', consentedAt: new Date() },
        { marriageId: marriage.id, userId: data.partnerId, status: 'PENDING' },
      ],
    });

    return marriage;
  }

  async getMyMarriages(userId: string) {
    return this.prisma.marriage.findMany({
      where: {
        OR: [
          { spouse1Id: userId },
          { spouse2Id: userId },
        ],
      },
      include: { consents: true, divorces: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMarriage(marriageId: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
      include: { consents: true, divorces: true },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    return marriage;
  }

  async getPendingConsents(userId: string) {
    return this.prisma.marriageConsent.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      include: { marriage: true },
    });
  }

  async grantConsent(userId: string, marriageId: string, approve: boolean, signature?: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
      include: { consents: true },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');

    // Update consent
    await this.prisma.marriageConsent.updateMany({
      where: { marriageId, userId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        consentedAt: new Date(),
        signature,
      },
    });

    // Update marriage consent flags
    const updateData: any = {};
    if (marriage.spouse1Id === userId) {
      updateData.spouse1ConsentGranted = approve;
      updateData.spouse1ConsentedAt = new Date();
    } else if (marriage.spouse2Id === userId) {
      updateData.spouse2ConsentGranted = approve;
      updateData.spouse2ConsentedAt = new Date();
    }

    // Check if both consents are granted → move to PENDING_REVIEW
    const updatedMarriage = await this.prisma.marriage.update({
      where: { id: marriageId },
      data: updateData,
    });

    if (approve && updatedMarriage.spouse1ConsentGranted && updatedMarriage.spouse2ConsentGranted) {
      return this.prisma.marriage.update({
        where: { id: marriageId },
        data: { status: 'PENDING_REVIEW' },
      });
    }

    if (!approve) {
      return this.prisma.marriage.update({
        where: { id: marriageId },
        data: { status: 'CANCELLED' },
      });
    }

    return updatedMarriage;
  }

  async fileDivorce(userId: string, data: {
    marriageId: string;
    reason: string;
    propertyDivision?: string;
  }) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: data.marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    if (marriage.status !== 'REGISTERED') {
      throw new BadRequestException('Can only divorce registered marriages');
    }
    if (marriage.spouse1Id !== userId && marriage.spouse2Id !== userId) {
      throw new ForbiddenException('You are not a party to this marriage');
    }

    return this.prisma.zagsDivorce.create({
      data: {
        marriageId: data.marriageId,
        initiatedById: userId,
        reason: data.reason,
        propertyDivision: data.propertyDivision,
        status: 'FILED',
      },
    });
  }

  async getCertificate(certificateNumber: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
    });
    if (!marriage) throw new NotFoundException('Certificate not found');
    return marriage;
  }

  async verifyCertificate(certificateNumber: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
    });

    if (!marriage) {
      return { isValid: false, certificateNumber, type: 'MARRIAGE' };
    }

    return {
      isValid: marriage.status === 'REGISTERED',
      certificateNumber,
      type: 'MARRIAGE',
      issuedDate: marriage.registeredAt,
      details: {
        spouse1Name: marriage.spouse1FullName,
        spouse2Name: marriage.spouse2FullName,
        marriageDate: marriage.marriageDate,
      },
    };
  }

  // Officer functions
  async getAllMarriages() {
    return this.prisma.marriage.findMany({
      include: { consents: true, divorces: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingMarriages() {
    return this.prisma.marriage.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: { consents: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveMarriage(marriageId: string, certificateNumber?: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    if (marriage.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Marriage not in reviewable state');
    }

    return this.prisma.marriage.update({
      where: { id: marriageId },
      data: {
        status: 'APPROVED',
        ...(certificateNumber ? { certificateNumber } : {}),
      },
    });
  }

  async rejectMarriage(marriageId: string, notes: string) {
    return this.prisma.marriage.update({
      where: { id: marriageId },
      data: { status: 'REJECTED' },
    });
  }

  async registerMarriage(marriageId: string, officerId: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { id: marriageId },
    });
    if (!marriage) throw new NotFoundException('Marriage not found');
    if (marriage.status !== 'APPROVED') {
      throw new BadRequestException('Marriage must be approved first');
    }

    return this.prisma.marriage.update({
      where: { id: marriageId },
      data: {
        status: 'REGISTERED',
        registeredBy: officerId,
        registeredAt: new Date(),
      },
    });
  }

  async finalizeDivorce(divorceId: string, officerId: string) {
    const divorce = await this.prisma.zagsDivorce.findUnique({
      where: { id: divorceId },
    });
    if (!divorce) throw new NotFoundException('Divorce not found');
    if (divorce.status !== 'FILED' && divorce.status !== 'UNDER_REVIEW') {
      throw new BadRequestException('Divorce not in reviewable state');
    }

    return this.prisma.zagsDivorce.update({
      where: { id: divorceId },
      data: {
        status: 'FINALIZED',
        finalizedDate: new Date(),
        finalizedById: officerId,
      },
    });
  }
}
