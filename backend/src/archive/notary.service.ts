import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStage } from '@prisma/client';
import { DocumentContractService } from './document-contract.service';

/**
 * NotaryService
 * 
 * Manages notarization of official documents.
 * Notaries are part of the State Archive system.
 */
@Injectable()
export class NotaryService {
  private readonly logger = new Logger(NotaryService.name);

  constructor(
    private prisma: PrismaService,
    private documentService: DocumentContractService,
  ) {}

  /**
   * Generate unique notarial registry number
   */
  private async generateRegistryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.notarizationRecord.count();
    const number = String(count + 1).padStart(4, '0');
    return `NR-${number}/${year}`;
  }

  /**
   * Get pending documents for notarization
   */
  async getPendingDocuments() {
    return this.prisma.documentContract.findMany({
      where: {
        currentStage: DocumentStage.PENDING_NOTARIZATION,
      },
      include: {
        template: true,
        issuer: { select: { id: true, username: true, role: true } },
        recipient: { select: { id: true, username: true, role: true } },
        signatures: {
          include: { signer: { select: { id: true, username: true, role: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Notarize a document
   */
  async notarizeDocument(
    documentId: string,
    notaryId: string,
    data: {
      notes?: string;
      sealImage?: string;  // Base64 encoded digital seal
      signature: string;   // Notary's digital signature
      publicKey: string;   // Notary's public key
    },
  ) {
    this.logger.log(`Notarizing document ${documentId} by notary ${notaryId}`);

    // Verify notary role
    const notary = await this.prisma.user.findUnique({
      where: { id: notaryId },
      select: { id: true, username: true, role: true },
    });

    if (!notary || notary.role !== 'NOTARY') {
      throw new BadRequestException('User is not authorized as a notary');
    }

    // Get document
    const document = await this.documentService.getDocument(documentId);

    if (document.currentStage !== DocumentStage.PENDING_NOTARIZATION) {
      throw new BadRequestException(
       `Document must be in PENDING_NOTARIZATION stage (current: ${document.currentStage})`,
      );
    }

    // Check if already notarized
    const existing = await this.prisma.notarizationRecord.findUnique({
      where: { documentId },
    });

    if (existing) {
      throw new BadRequestException('Document is already notarized');
    }

    // Generate registry number
    const registryNumber = await this.generateRegistryNumber();

    // Create notarization record
    const notarization = await this.prisma.notarizationRecord.create({
      data: {
        documentId,
        notaryId,
        registryNumber,
        notes: data.notes,
        sealImage: data.sealImage,
        signature: data.signature,
        publicKey: data.publicKey,
      },
      include: {
        notary: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    // Advance document stage to NOTARIZED
    await this.documentService.advanceStage(
      documentId,
      DocumentStage.NOTARIZED,
      notaryId,
      `Notarized by ${notary.username} (Registry #${registryNumber})`,
    );

    this.logger.log(`Document notarized: ${document.documentNumber} (${registryNumber})`);

    return notarization;
  }

  /**
   * Get notarization record for document
   */
  async getNotarization(documentId: string) {
    const notarization = await this.prisma.notarizationRecord.findUnique({
      where: { documentId },
      include: {
        document: {
          select: {
            documentNumber: true,
            title: true,
            currentStage: true,
          },
        },
        notary: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    if (!notarization) {
      throw new NotFoundException('Notarization record not found');
    }

    return notarization;
  }

  /**
   * List all notarizations by a notary
   */
  async getNotaryRecords(notaryId: string) {
    return this.prisma.notarizationRecord.findMany({
      where: { notaryId },
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
      orderBy: { notarizedAt: 'desc' },
    });
  }

  /**
   * Get notarial registry (all notarizations)
   */
  async getRegistry(filters?: {
    notaryId?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    return this.prisma.notarizationRecord.findMany({
      where: {
        ...(filters?.notaryId ? { notaryId: filters.notaryId } : {}),
        ...(filters?.fromDate || filters?.toDate
          ? {
              notarizedAt: {
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
        notary: {
          select: { id: true, username: true },
        },
      },
      orderBy: { notarizedAt: 'desc' },
    });
  }
}
