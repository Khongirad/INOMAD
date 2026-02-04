import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-zags';

@Injectable()
export class CertificateService {
  constructor(
    @Inject('ZAGS_PRISMA') private prisma: PrismaClient,
  ) {}

  /**
   * Generate marriage certificate (PDF, blockchain-backed)
   */
  async generateMarriageCertificate(certificateNumber: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
    });

    if (!marriage) {
      throw new Error('Marriage not found');
    }

    if (marriage.status !== 'REGISTERED') {
      throw new Error('Marriage must be registered to generate certificate');
    }

    // TODO: Generate PDF certificate
    // TODO: Store hash on blockchain for verification
    
    return {
      certificateNumber: marriage.certificateNumber,
      spouse1: marriage.spouse1FullName,
      spouse2: marriage.spouse2FullName,
      marriageDate: marriage.marriageDate,
      registeredAt: marriage.registeredAt,
      // pdfUrl: 'https://...',
      // blockchainHash: '0x...',
    };
  }

  /**
   * Verify certificate authenticity
   */
  async verifyCertificate(certificateNumber: string) {
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
    });

    if (!marriage) {
      return {
        isValid: false,
        reason: 'Certificate not found',
      };
    }

    if (marriage.status !== 'REGISTERED') {
      return {
        isValid: false,
        reason: 'Marriage is not registered',
      };
    }

    return {
      isValid: true,
      certificateNumber: marriage.certificateNumber,
      marriageDate: marriage.marriageDate,
      isPublic: marriage.isPublic,
    };
  }

  /**
   * Get public registry entry (limited info)
   */
  async getPublicRegistry(certificateNumber: string) {
    // This is public info only - no names or private details
    const marriage = await this.prisma.marriage.findUnique({
      where: { certificateNumber },
      select: {
        certificateNumber: true,
        marriageDate: true,
        status: true,
        isPublic: true,
      },
    });

    if (!marriage || !marriage.isPublic) {
      return null;
    }

    return {
      certificateNumber: marriage.certificateNumber,
      issuedDate: marriage.marriageDate,
      isValid: marriage.status === 'REGISTERED',
    };
  }
}
