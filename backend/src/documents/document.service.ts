import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { DocumentType, DocumentStatus, SignatureRole } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
  ) {}

  /**
   * Create document from template
   */
  async createDocument(data: {
    templateId: string;
    creatorId: string;
    metadata: any;
    recipientIds: string[];
    witnessIds?: string[];
  }) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: data.templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Render template with metadata
    const content = this.renderTemplate(template.template, data.metadata);

    const document = await this.prisma.document.create({
      data: {
        templateId: data.templateId,
        creatorId: data.creatorId,
        recipientIds: data.recipientIds,
        witnessIds: data.witnessIds || [],
        title: data.metadata.title || template.name,
        content,
        metadata: data.metadata,
        status: 'DRAFT',
      },
      include: {
        template: true,
        creator: { select: { id: true, username: true } },
      },
    });

    // Create timeline event
    await this.timeline.createEvent({
      type: 'DOCUMENT_CREATED',
      actorId: data.creatorId,
      title: `Created ${template.name}`,
      metadata: { documentId: document.id },
    });

    return document;
  }

  /**
   * Sign document with digital signature
   */
  async signDocument(data: {
    documentId: string;
    signerId: string;
    signature: string;
    ipAddress?: string;
    location?: string;
  }) {
    const document = await this.prisma.document.findUnique({
      where: { id: data.documentId },
      include: { signatures: true, template: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    if (document.status === 'ARCHIVED' || document.status === 'CANCELLED') {
      throw new Error('Cannot sign archived/cancelled document');
    }

    // Check if already signed
    if (document.signatures.some((s) => s.signerId === data.signerId)) {
      throw new Error('Already signed this document');
    }

    // Determine role
    let role: SignatureRole;
    if (document.creatorId === data.signerId) {
      role = 'CREATOR';
    } else if (document.recipientIds.includes(data.signerId)) {
      role = 'RECIPIENT';
    } else if (document.witnessIds.includes(data.signerId)) {
      role = 'WITNESS';
    } else {
      throw new Error('Not authorized to sign this document');
    }

    // Create signature
    const newSignature = await this.prisma.documentSignature.create({
      data: {
        documentId: data.documentId,
        signerId: data.signerId,
        role,
        signature: data.signature,
        ipAddress: data.ipAddress,
        location: data.location,
      },
    });

    // Check if all signatures collected
    const totalRequired =
      1 + // creator
      document.recipientIds.length +
      document.witnessIds.length;

    const currentlySigned = document.signatures.length + 1; // +1 for new signature

    if (currentlySigned === totalRequired) {
      await this.finalizeDocument(data.documentId);
    } else {
      await this.prisma.document.update({
        where: { id: data.documentId },
        data: { status: 'PARTIALLY_SIGNED' },
      });
    }

    // Timeline event for signature
    await this.timeline.createEvent({
      type: 'DOCUMENT_SIGNED',
      actorId: data.signerId,
      title: `Signed: ${document.title}`,
      metadata: { documentId: data.documentId },
    });

    return newSignature;
  }

  /**
   * Finalize document after all signatures collected
   */
  private async finalizeDocument(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { template: true, signatures: true },
    });

    // Generate archive hash
    const documentHash = this.generateHash(document!);

    // Update status
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FULLY_SIGNED',
        archiveHash: documentHash,
        archivedAt: new Date(),
      },
    });

    // Create timeline event for completion
    await this.timeline.recordContract({
      type: 'DOCUMENT_FINALIZED',
      actorId: document!.creatorId,
      title: `${document!.template.name} Fully Signed`,
      contractHash: documentHash,
      witnessIds: document!.witnessIds,
      metadata: { documentId },
    });

    return updated;
  }

  /**
   * Get my documents with filters
   */
  async getMyDocuments(
    userId: string,
    filters?: {
      status?: DocumentStatus;
      type?: DocumentType;
    },
  ) {
    return this.prisma.document.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { recipientIds: { has: userId } },
          { witnessIds: { has: userId } },
        ],
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { template: { type: filters.type } }),
      },
      include: {
        template: true,
        signatures: {
          include: {
            signer: { select: { id: true, username: true } },
          },
        },
        creator: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string) {
    return this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        template: true,
        signatures: {
          include: {
            signer: { select: { id: true, username: true } },
          },
        },
        creator: { select: { id: true, username: true } },
      },
    });
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, metadata: any): string {
    let result = template;

    // Replace {{variable}} with metadata values
    Object.keys(metadata).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, metadata[key] || '');
    });

    return result;
  }

  /**
   * Generate cryptographic hash for document
   */
  private generateHash(document: any): string {
    const data = JSON.stringify({
      content: document.content,
      metadata: document.metadata,
      parties: {
        creator: document.creatorId,
        recipients: document.recipientIds,
        witnesses: document.witnessIds,
      },
      signatures: document.signatures.map((s: any) => s.signature),
    });

    return createHash('sha256').update(data).digest('hex');
  }
}
