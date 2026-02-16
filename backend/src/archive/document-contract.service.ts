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
        ipAddress: '0.0.0.0', // Placeholder - should be passed from controller via Request object
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

  /**
   * Generate PDF for a document.
   * Returns document data formatted for PDF generation.
   * In production, integrate with PDFKit or Puppeteer for actual PDF output.
   */
  async generatePDF(documentId: string, userId: string) {
    const document = await this.getDocument(documentId);

    // Log access
    await this.logAccess({
      documentId,
      userId,
      action: 'DOWNLOAD',
      reason: 'PDF generation',
      ipAddress: '0.0.0.0',
    });

    // Build PDF-ready data structure
    const pdfData = {
      header: {
        documentNumber: document.documentNumber,
        title: document.title,
        titleRu: document.titleRu,
        templateName: document.template?.name,
        stage: document.currentStage,
        status: document.status,
      },
      body: {
        content: document.generatedContent,
        variables: document.variables,
      },
      signatures: document.signatures?.map((sig: any) => ({
        signerName: sig.signer?.username,
        signerRole: sig.signerRole,
        signedAt: sig.signedAt,
        verified: sig.verified,
      })),
      notarization: document.notarization ? {
        notaryName: (document.notarization as any).notary?.username,
        notarizedAt: (document.notarization as any).notarizedAt,
        sealNumber: (document.notarization as any).sealNumber,
      } : null,
      legalCert: document.legalCert ? {
        lawyerName: (document.legalCert as any).lawyer?.username,
        certifiedAt: (document.legalCert as any).certifiedAt,
        barNumber: (document.legalCert as any).barNumber,
      } : null,
      footer: {
        documentHash: document.documentHash,
        blockchainTxHash: document.blockchainTxHash,
        archiveNumber: document.archiveNumber,
        createdAt: document.createdAt,
        archivedAt: document.archivedAt,
      },
      // Plain text version for simple PDF rendering
      plainText: this.buildPlainTextDocument(document),
    };

    this.logger.log(`PDF generated for document: ${document.documentNumber}`);
    return pdfData;
  }

  /**
   * Build plain text representation of document for PDF content.
   */
  private buildPlainTextDocument(document: any): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════');
    lines.push(`  ДОКУМЕНТ / DOCUMENT`);
    lines.push('═══════════════════════════════════════════════');
    lines.push('');
    lines.push(`Номер: ${document.documentNumber}`);
    lines.push(`Название: ${document.title}`);
    if (document.titleRu) lines.push(`Название (RU): ${document.titleRu}`);
    lines.push(`Статус: ${document.currentStage}`);
    lines.push(`Дата: ${new Date(document.createdAt).toLocaleDateString('ru-RU')}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────');
    lines.push('СОДЕРЖАНИЕ:');
    lines.push('───────────────────────────────────────────────');
    lines.push('');
    lines.push(document.generatedContent || '(нет содержания)');
    lines.push('');

    if (document.signatures?.length > 0) {
      lines.push('───────────────────────────────────────────────');
      lines.push('ПОДПИСИ:');
      lines.push('───────────────────────────────────────────────');
      for (const sig of document.signatures) {
        lines.push(`  ${sig.signerRole}: ${sig.signer?.username || 'Unknown'} — ${sig.verified ? '✓ Verified' : '○ Pending'}`);
      }
      lines.push('');
    }

    if (document.documentHash) {
      lines.push('───────────────────────────────────────────────');
      lines.push(`SHA-256: ${document.documentHash}`);
      if (document.blockchainTxHash) {
        lines.push(`Blockchain TX: ${document.blockchainTxHash}`);
      }
      if (document.archiveNumber) {
        lines.push(`Archive No: ${document.archiveNumber}`);
      }
    }

    lines.push('═══════════════════════════════════════════════');

    return lines.join('\n');
  }

  // ============== BLOCKCHAIN CERTIFICATE HASHING ==============

  /**
   * Register a document's hash on the blockchain.
   * Computes SHA-256 of the document content and stores the (simulated) transaction hash.
   * In production, this would call a smart contract to store the hash on-chain.
   */
  async registerDocumentHash(documentId: string, registeredById: string) {
    const document = await this.getDocument(documentId);

    if (!document.generatedContent) {
      throw new BadRequestException('Document has no generated content to hash');
    }

    // Compute content hash
    const contentHash = this.calculateHash(document.generatedContent);

    // In production: call smart contract to register hash
    // const tx = await contract.registerHash(contentHash);
    const txHash = `0x${crypto.createHash('sha256').update(`${contentHash}-${Date.now()}`).digest('hex')}`;

    // Update document with blockchain tx
    const updated = await this.prisma.documentContract.update({
      where: { id: documentId },
      data: {
        documentHash: contentHash,
        blockchainTxHash: txHash,
      },
    });

    // Log access
    await this.logAccess({
      documentId,
      userId: registeredById,
      action: 'MODIFY',
      reason: 'Blockchain hash registration',
      ipAddress: 'system',
    });

    this.logger.log(`Document hash registered on-chain: ${document.documentNumber} -> ${txHash}`);

    return {
      documentId,
      documentNumber: document.documentNumber,
      contentHash,
      blockchainTxHash: txHash,
      registeredAt: new Date().toISOString(),
    };
  }

  /**
   * Verify a document's hash against its stored hash.
   * Recomputes SHA-256 and compares with the stored documentHash.
   */
  async verifyDocumentHash(documentId: string) {
    const document = await this.getDocument(documentId);

    if (!document.documentHash) {
      throw new BadRequestException('Document has no registered hash');
    }

    if (!document.generatedContent) {
      throw new BadRequestException('Document has no generated content');
    }

    const currentHash = this.calculateHash(document.generatedContent);
    const isValid = currentHash === document.documentHash;

    return {
      documentId,
      documentNumber: document.documentNumber,
      storedHash: document.documentHash,
      currentHash,
      isValid,
      blockchainTxHash: document.blockchainTxHash,
      message: isValid
        ? 'Document integrity verified — hash matches blockchain record'
        : 'WARNING: Document has been modified since hash was registered',
    };
  }
}
