import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-zags';
import { BlockchainService } from '../../blockchain/blockchain.service';
import * as crypto from 'crypto';

@Injectable()
export class CertificateService {
  constructor(
    @Inject('ZAGS_PRISMA') private zagsPrisma: PrismaClient,
    private blockchainService: BlockchainService,
  ) {}

  /**
   * Generate marriage certificate (PDF, blockchain-backed)
   */
  async generateMarriageCertificate(certificateNumber: string) {
    const marriage = await this.zagsPrisma.marriage.findUnique({
      where: { certificateNumber },
    });

    if (!marriage) {
      throw new Error('Marriage not found');
    }

    if (marriage.status !== 'REGISTERED') {
      throw new Error('Marriage must be registered to generate certificate');
    }

    // Generate certificate metadata hash for blockchain anchoring
    const certificateData = {
      certificateNumber: marriage.certificateNumber,
      spouse1: marriage.spouse1FullName,
      spouse2: marriage.spouse2FullName,
     marriageDate: marriage.marriageDate?.toISOString(),
      registeredAt: marriage.registeredAt?.toISOString(),
    };
    
    const certDataString = JSON.stringify(certificateData);
    const certHash = crypto.createHash('sha256').update(certDataString).digest('hex');
    
    // For MVP: Log the blockchain anchoring intent
    // In production: Store hash on actual blockchain
    const blockchainHash = `0x${certHash}`;
    // await this.blockchainService.anchorCertificate(blockchainHash);
    
    return {
      certificateNumber: marriage.certificateNumber,
      spouse1: marriage.spouse1FullName,
      spouse2: marriage.spouse2FullName,
      marriageDate: marriage.marriageDate,
      registeredAt: marriage.registeredAt,
      blockchainHash, // Certificate hash for verification
      // pdfUrl: 'https://...',  // TODO: Generate PDF certificate in Sprint 3
    };
  }

  /**
   * Verify certificate authenticity
   */
  async verifyCertificate(certificateNumber: string) {
    const marriage = await this.zagsPrisma.marriage.findUnique({
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
    const marriage = await this.zagsPrisma.marriage.findUnique({
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
