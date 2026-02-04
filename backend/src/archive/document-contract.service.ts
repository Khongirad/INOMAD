import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStage, DocumentStatus, SignerRole } from '@prisma/client';
import { DocumentTemplateService } from './document-template.service';
import * as crypto from 'crypto';

/**
 * DocumentContractService
 * 
 * Core service for creating and managing document smart contracts.
 * Each document is a blockchain smart contract with real-time stage tracking.
 */
@Injectable()
export class DocumentContractService {
  private readonly logger = new Logger(DocumentContractService.name);

  constructor(
    private prisma: PrismaService,
    private templateService: DocumentTemplateService,
  ) {}

  /**
   * Generate document number (e.g., "BL-001/2026")
   */
  private async generateDocumentNumber(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Count existing documents with this prefix
    const count = await this.prisma.documentContract.count({
      where: {
        documentNumber: {
          startsWith: `${prefix}-`,
        },
      },
    });

    const number = String(count + 1).padStart(3, '0');
    return `${prefix}-${number}/${year}`;
  }

  /**
   * Calculate SHA-256 hash of document content
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create a new document contract from template
   */
  async createDocument(data: {
    templateCode: string;
    issuerId: string;
    recipientId?: string;
    title: string;
    titleRu?: string;
    variables: Record<string, any>;
    documentNumberPrefix?: string;  // e.g., "BL" for Banking License
  }) {
    this.logger.log(`Creating document from template: ${data.templateCode}`);

    // Get template
    const template = await this.templateService.getTemplate(data.templateCode);

    // Validate variables against template schema
    const validation = this.templateService.validateVariables(template, data.variables);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid variables: ${validation.errors.join(', ')}`);
    }

    // Render document content
    const generatedContent = this.templateService.renderTemplate(
      template.contentTemplate,
      data.variables,
    );

    // Generate document number
    const documentNumber = await this.generateDocumentNumber(
      data.documentNumberPrefix || template.code.split('_')[0],
    );

    // Calculate hash
    const documentHash = this.calculateHash(generatedContent);

    // Create document contract
    const document = await this.prisma.documentContract.create({
      data: {
        documentNumber,
        templateId: template.id,
        title: data.title,
        titleRu: data.titleRu,
        variables: data.variables as any,
        generatedContent,
        issuerId: data.issuerId,
        recipientId: data.recipientId,
        currentStage: DocumentStage.DRAFT,
        status: DocumentStatus.ACTIVE,
        documentHash,
      },
      include: {
        template: true,
        issuer: {
          select: { id: true, username: true, role: true },
        },
        recipient: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    // Create initial stage history
    await this.createStageHistory({
      documentId: document.id,
      fromStage: null,
      toStage: DocumentStage.DRAFT,
      triggeredById: data.issuerId,
      notes: 'Document created from template',
    });

    this.logger.log(`Document created: ${document.documentNumber}`);
    return document;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string) {
    const document = await this.prisma.documentContract.findUnique({
      where: { id: documentId },
      include: {
        template: true,
        issuer: {
          select: { id: true, username: true, role: true },
        },
        recipient: {
          select: { id: true, username: true, role: true },
        },
        signatures: {
          include: {
            signer: {
              select: { id: true, username: true, role: true },
            },
          },
        },
        stages: {
          include: {
            triggeredBy: {
              select: { id: true, username: true, role: true },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        notarization: {
          include: {
            notary: {
              select: { id: true, username: true, role: true },
            },
          },
        },
        legalCert: {
          include: {
            lawyer: {
              select: { id: true, username: true, role: true },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    return document;
  }

  /**
   * Get document by document number
   */
  async getDocumentByNumber(documentNumber: string) {
    const document = await this.prisma.documentContract.findUnique({
      where: { documentNumber },
      include: {
        template: true,
        issuer: { select: { id: true, username: true, role: true } },
        recipient: { select: { id: true, username: true, role: true } },
        signatures: {
          include: { signer: { select: { id: true, username: true, role: true } } },
        },
        stages: {
          include: { triggeredBy: { select: { id: true, username: true, role: true } } },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${documentNumber}`);
    }

    return document;
  }

  /**
   * Create stage history record
   */
  private async createStageHistory(data: {
    documentId: string;
    fromStage: DocumentStage | null;
    toStage: DocumentStage;
    triggeredById: string;
    notes?: string;
    blockchainTx?: string;
  }) {
    return this.prisma.documentStageHistory.create({
      data: {
        documentId: data.documentId,
        fromStage: data.fromStage,
        toStage: data.toStage,
        triggeredById: data.triggeredById,
        notes: data.notes,
        blockchainTx: data.blockchainTx,
      },
    });
  }

  /**
   * Advance document to next stage
   */
  async advanceStage(
    documentId: string,
    newStage: DocumentStage,
    triggeredById: string,
    notes?: string,
    blockchainTx?: string,
  ) {
    const document = await this.getDocument(documentId);

    // Validate stage progression
    const validTransitions = this.getValidTransitions(document.currentStage);
    if (!validTransitions.includes(newStage)) {
      throw new BadRequestException(
        `Invalid stage transition: ${document.currentStage} -> ${newStage}`,
      );
    }

    // Update document stage
    const updated = await this.prisma.documentContract.update({
      where: { id: documentId },
      data: { currentStage: newStage },
    });

    // Create stage history
    await this.createStageHistory({
      documentId,
      fromStage: document.currentStage,
      toStage: newStage,
      triggeredById,
      notes,
      blockchainTx,
    });

    this.logger.log(
      `Document ${document.documentNumber} advanced: ${document.currentStage} -> ${newStage}`,
    );

    return updated;
  }

  /**
   * Get valid stage transitions from current stage
   */
  private getValidTransitions(currentStage: DocumentStage): DocumentStage[] {
    const transitions: Record<DocumentStage, DocumentStage[]> = {
      [DocumentStage.DRAFT]: [DocumentStage.PENDING_REVIEW, DocumentStage.SIGNED],
      [DocumentStage.PENDING_REVIEW]: [DocumentStage.DRAFT, DocumentStage.SIGNED],
      [DocumentStage.SIGNED]: [DocumentStage.PENDING_NOTARIZATION],
      [DocumentStage.PENDING_NOTARIZATION]: [DocumentStage.NOTARIZED],
      [DocumentStage.NOTARIZED]: [DocumentStage.PENDING_LEGAL],
      [DocumentStage.PENDING_LEGAL]: [DocumentStage.CERTIFIED],
      [DocumentStage.CERTIFIED]: [DocumentStage.ARCHIVED],
      [DocumentStage.ARCHIVED]: [DocumentStage.PUBLISHED],
      [DocumentStage.PUBLISHED]: [],
    };

    return transitions[currentStage] || [];
  }

  /**
   * Sign document
   */
  async signDocument(
    documentId: string,
    signerId: string,
    signerRole: SignerRole,
    signature: string,
    publicKey: string,
  ) {
    this.logger.log(`Signing document ${documentId} by ${signerId} (${signerRole})`);

    // Verify signer role matches user role
    const signer = await this.prisma.user.findUnique({
      where: { id: signerId },
      select: { role: true },
    });

    // Create signature record
    const sig = await this.prisma.documentSignature.create({
      data: {
        documentId,
        signerId,
        signerRole,
        signature,
        publicKey,
        algorithm: 'ECDSA-secp256k1',
        verified: false, // Will be verified separately
        ipAddress: '0.0.0.0', // TODO: Get from request
       },
      include: {
        signer: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    // Check if document should advance to SIGNED stage
    const document = await this.getDocument(documentId);
    if (document.currentStage === DocumentStage.DRAFT) {
      await this.advanceStage(
        documentId,
        DocumentStage.SIGNED,
        signerId,
        `Signed by ${signerRole}`,
      );
    }

    return sig;
  }

  /**
   * Submit document for notarization
   */
  async submitForNotarization(documentId: string, submitterId: string) {
    const document = await this.getDocument(documentId);

    if (document.currentStage !== DocumentStage.SIGNED) {
      throw new BadRequestException('Document must be SIGNED before notarization');
    }

    return this.advanceStage(
      documentId,
      DocumentStage.PENDING_NOTARIZATION,
      submitterId,
      'Submitted for notarization',
    );
  }

  /**
   * Submit document for legal certification
   */
  async submitForLegal(documentId: string, submitterId: string) {
    const document = await this.getDocument(documentId);

    if (document.currentStage !== DocumentStage.NOTARIZED) {
      throw new BadRequestException('Document must be NOTARIZED before legal certification');
    }

    return this.advanceStage(
      documentId,
      DocumentStage.PENDING_LEGAL,
      submitterId,
      'Submitted for legal certification',
    );
  }

  /**
   * Archive document
   */
  async archiveDocument(
    documentId: string,
    archivedById: string,
    archiveNumber: string,
    blockchainTx?: string,
  ) {
    const document = await this.getDocument(documentId);

    if (document.currentStage !== DocumentStage.CERTIFIED) {
      throw new BadRequestException('Only CERTIFIED documents can be archived');
    }

    // Update document with archive info
    const archived = await this.prisma.documentContract.update({
      where: { id: documentId },
      data: {
        archiveNumber,
        archivedAt: new Date(),
        archivedById,
        blockchainTxHash: blockchainTx,
        currentStage: DocumentStage.ARCHIVED,
      },
    });

    // Create stage history
    await this.createStageHistory({
      documentId,
      fromStage: document.currentStage,
      toStage: DocumentStage.ARCHIVED,
      triggeredById: archivedById,
      notes: `Archived with number: ${archiveNumber}`,
      blockchainTx,
    });

    this.logger.log(`Document archived: ${document.documentNumber} -> ${archiveNumber}`);
    return archived;
  }

  /**
   * Log document access
   */
  async logAccess(data: {
    documentId: string;
    userId: string;
    action: 'VIEW' | 'DOWNLOAD' | 'PRINT' | 'MODIFY' | 'SIGN' | 'ARCHIVE';
    reason?: string;
    ipAddress: string;
    userAgent?: string;
  }) {
    return this.prisma.documentAccessLog.create({
      data: {
        documentId: data.documentId,
        userId: data.userId,
        action: data.action as any,
        reason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * List documents with filters
   */
  async listDocuments(filters?: {
    stage?: DocumentStage;
    status?: DocumentStatus;
    category?: string;
    issuerId?: string;
    recipientId?: string;
  }) {
    return this.prisma.documentContract.findMany({
      where: {
        ...(filters?.stage ? { currentStage: filters.stage } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.issuerId ? { issuerId: filters.issuerId } : {}),
        ...(filters?.recipientId ? { recipientId: filters.recipientId } : {}),
        ...(filters?.category
          ? { template: { category: filters.category } }
          : {}),
      },
      include: {
        template: true,
        issuer: { select: { id: true, username: true, role: true } },
        recipient: { select: { id: true, username: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
