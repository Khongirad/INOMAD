import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStage } from '@prisma/client';
import { DocumentContractService } from './document-contract.service';

/**
 * LegalService
 * 
 * Manages legal certification of official documents.
 * State lawyers are part of the State Archive system.
 */
@Injectable()
export class LegalService {
  private readonly logger = new Logger(LegalService.name);

  constructor(
    private prisma: PrismaService,
    private documentService: DocumentContractService,
  ) {}

  /**
   * Get pending documents for legal certification
   */
  async getPendingDocuments() {
    return this.prisma.documentContract.findMany({
      where: {
        currentStage: DocumentStage.PENDING_LEGAL,
      },
      include: {
        template: true,
        issuer: { select: { id: true, username: true, role: true } },
        recipient: { select: { id: true, username: true, role: true } },
        signatures: {
          include: { signer: { select: { id: true, username: true, role: true } } },
        },
        notarization: {
          include: { notary: { select: { id: true, username: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Certify a document (legal approval)
   */
  async certifyDocument(
    documentId: string,
    lawyerId: string,
    data: {
      opinion: string;        // Legal opinion (English)
      opinionRu?: string;     // Optional Russian translation
      compliant: boolean;     // Does it meet legal requirements?
      notes?: string;
      signature: string;      // Lawyer's digital signature
      publicKey: string;      // Lawyer's public key
    },
  ) {
    this.logger.log(`Legal certification of document ${documentId} by lawyer ${lawyerId}`);

    // Verify lawyer role
    const lawyer = await this.prisma.user.findUnique({
      where: { id: lawyerId },
      select: { id: true, username: true, role: true },
    });

    if (!lawyer || lawyer.role !== 'STATE_LAWYER') {
      throw new BadRequestException('User is not authorized as a state lawyer');
    }

    // Get document
    const document = await this.documentService.getDocument(documentId);

    if (document.currentStage !== DocumentStage.PENDING_LEGAL) {
      throw new BadRequestException(
        `Document must be in PENDING_LEGAL stage (current: ${document.currentStage})`,
      );
    }

    // Check if already certified
    const existing = await this.prisma.legalCertification.findUnique({
      where: { documentId },
    });

    if (existing) {
      throw new BadRequestException('Document is already legally certified');
    }

    // Verify document is notarized
    const notarization = await this.prisma.notarizationRecord.findUnique({
      where: { documentId },
    });

    if (!notarization) {
      throw new BadRequestException('Document must be notarized before legal certification');
    }

    // Create legal certification record
    const certification = await this.prisma.legalCertification.create({
      data: {
        documentId,
        lawyerId,
        opinion: data.opinion,
        opinionRu: data.opinionRu,
        compliant: data.compliant,
        notes: data.notes,
        signature: data.signature,
        publicKey: data.publicKey,
      },
      include: {
        lawyer: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    // Advance document stage to CERTIFIED (if compliant)
    if (data.compliant) {
      await this.documentService.advanceStage(
        documentId,
        DocumentStage.CERTIFIED,
        lawyerId,
        `Legally certified by ${lawyer.username}. Opinion: ${data.opinion.substring(0, 100)}...`,
      );

      this.logger.log(
        `Document certified as compliant: ${document.documentNumber}`,
      );
    } else {
      // If not compliant, keep in PENDING_LEGAL or revert to earlier stage
      this.logger.warn(
        `Document NOT certified (non-compliant): ${document.documentNumber}`,
      );
    }

    return certification;
  }

  /**
   * Get legal certification for document
   */
  async getCertification(documentId: string) {
    const certification = await this.prisma.legalCertification.findUnique({
      where: { documentId },
      include: {
        document: {
          select: {
            documentNumber: true,
            title: true,
            currentStage: true,
          },
        },
        lawyer: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    if (!certification) {
      throw new NotFoundException('Legal certification record not found');
    }

    return certification;
  }

  /**
   * List all certifications by a lawyer
   */
  async getLawyerCertifications(lawyerId: string) {
    return this.prisma.legalCertification.findMany({
      where: { lawyerId },
      include: {
        document: {
          select: {
            documentNumber: true,
            title: true,
            currentStage: true,
            createdAt: true,
          },
        },
      },
      orderBy: { certifiedAt: 'desc' },
    });
  }

  /**
   * Get all legal opinions (for reference/research)
   */
  async getOpinions(filters?: {
    lawyerId?: string;
    compliant?: boolean;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return this.prisma.legalCertification.findMany({
      where: {
        ...(filters?.lawyerId ? { lawyerId: filters.lawyerId } : {}),
        ...(filters?.compliant !== undefined ? { compliant: filters.compliant } : {}),
        ...(filters?.fromDate || filters?.toDate
          ? {
              certifiedAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      include: {
        document: {
          select: {
            documentNumber: true,
            title: true,
            template: { select: { name: true, category: true } },
          },
        },
        lawyer: {
          select: { id: true, username: true },
        },
      },
      orderBy: { certifiedAt: 'desc' },
    });
  }

  /**
   * Request revision (lawyer rejects document)
   */
  async requestRevision(
    documentId: string,
    lawyerId: string,
    reason: string,
  ) {
    this.logger.log(`Lawyer ${lawyerId} requesting revision for document ${documentId}`);

    // Create non-compliant certification
    return this.certifyDocument(documentId, lawyerId, {
      opinion: `Revision requested: ${reason}`,
      compliant: false,
      signature: 'REVISION_REQUEST',
      publicKey: 'N/A',
    });
  }
}
