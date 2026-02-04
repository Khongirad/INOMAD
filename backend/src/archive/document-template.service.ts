import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStage, SignerRole } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * DocumentTemplateService
 * 
 * Manages document templates for the State Archive system.
 * Templates are the universal constructor for all official documents.
 */
@Injectable()
export class DocumentTemplateService {
  private readonly logger = new Logger(DocumentTemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new document template
   * Only authorized Archive administrators can create templates
   */
  async createTemplate(creatorId: string, data: {
    code: string;                    // e.g., "BANKING_LICENSE_001"
    name: string;                    // e.g., "Banking License"
    nameRu?: string;                 // Russian translation
    category: string;                // "Banking", "Emission", "Legal"
    templateSchema: object;          // Field definitions with types
    requiredFields: string[];
    optionalFields: string[];
    contentTemplate: string;         // Mustache/Handlebars template
    headerTemplate?: string;
    footerTemplate?: string;
    requiredSignatures: string[];    // ["CB_GOVERNOR", "NOTARY", "LAWYER"]
    stagesRequired: string[];        // ["DRAFT", "SIGNED", "NOTARIZED", ...]
    blockchainEnabled?: boolean;
    contractTemplate?: string;       // Smart contract template
    validationRules?: object;
  }) {
    this.logger.log(`Creating document template: ${data.code}`);

    // Verify creator is authorized (Creator or Archive admin)
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { role: true },
    });

    if (!creator || !['CREATOR', 'ARCHIVIST'].includes(creator.role)) {
      throw new BadRequestException('Unauthorized to create document templates');
    }

    // Create template
    const template = await this.prisma.documentTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        nameRu: data.nameRu,
        category: data.category,
        version: '1.0',
        templateSchema: data.templateSchema as any,
        requiredFields: data.requiredFields,
        optionalFields: data.optionalFields,
        contentTemplate: data.contentTemplate,
        headerTemplate: data.headerTemplate,
        footerTemplate: data.footerTemplate,
        requiredSignatures: data.requiredSignatures,
        stagesRequired: data.stagesRequired,
        blockchainEnabled: data.blockchainEnabled ?? true,
        contractTemplate: data.contractTemplate,
        validationRules: data.validationRules as any,
        status: 'ACTIVE',
        createdById: creatorId,
      },
    });

    this.logger.log(`Template created: ${template.id} (${template.code})`);
    return template;
  }

  /**
   * Get template by code
   */
  async getTemplate(code: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${code}`);
    }

    return template;
  }

  /**
   * List all active templates
   */
  async listTemplates(category?: string) {
    return this.prisma.documentTemplate.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validate template variables against schema
   */
  validateVariables(template: any, variables: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    for (const field of template.requiredFields) {
      if (!variables[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // TODO: Validate against templateSchema (JSON schema validation)
    // TODO: Apply validationRules if present

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Render template with variables (Mustache-style)
   * Simple implementation - replace {{variable}} with values
   */
  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    return rendered;
  }

  /**
   * Update template version (creates new version)
   */
  async updateTemplate(code: string, adminId: string, updates: Partial<{
    contentTemplate: string;
    templateSchema: object;
    requiredSignatures: string[];
    stagesRequired: string[];
  }>) {
    const template = await this.getTemplate(code);

    // Parse current version and increment
    const currentVersion = parseFloat(template.version);
    const newVersion = (currentVersion + 0.1).toFixed(1);

    const updated = await this.prisma.documentTemplate.update({
      where: { code },
      data: {
        ...updates,
        version: newVersion,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Template updated: ${code} (v${newVersion})`);
    return updated;
  }

  /**
   * Deprecate template
   */
  async deprecateTemplate(code: string, adminId: string) {
    return this.prisma.documentTemplate.update({
      where: { code },
      data: { status: 'DEPRECATED' },
    });
  }
}
