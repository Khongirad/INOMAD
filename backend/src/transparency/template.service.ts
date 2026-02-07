import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PowerBranchType, HierarchyLevel, Prisma } from '@prisma/client';
import Ajv from 'ajv';

const ajv = new Ajv();

export interface CreateTemplateParams {
  code: string;
  name: string;
  description: string;
  powerBranch: PowerBranchType;
  parametersSchema: Record<string, any>;
  actionNameTemplate: string;
  descriptionTemplate: string;
  applicableLevels: HierarchyLevel[];
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new GOST activity template
   */
  async createTemplate(params: CreateTemplateParams) {
    const template = await this.prisma.activityTemplate.create({
      data: {
        code: params.code,
        name: params.name,
        description: params.description,
        powerBranch: params.powerBranch,
        parametersSchema: params.parametersSchema as Prisma.InputJsonValue,
        actionNameTemplate: params.actionNameTemplate,
        descriptionTemplate: params.descriptionTemplate,
        applicableLevels: params.applicableLevels,
      },
    });

    this.logger.log(`Created GOST template: ${params.code}`);
    return template;
  }

  /**
   * Get all templates, optionally filtered by power branch
   */
  async getTemplates(powerBranch?: PowerBranchType, isActive = true) {
    return this.prisma.activityTemplate.findMany({
      where: {
        ...(powerBranch && { powerBranch }),
        isActive,
      },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Get a specific template by code
   */
  async getTemplateByCode(code: string) {
    return this.prisma.activityTemplate.findUnique({
      where: { code },
    });
  }

  /**
   * Validate activity parameters against template schema
   */
  async validateActivity(templateId: string, parameters: Record<string, any>) {
    const template = await this.prisma.activityTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const schema = template.parametersSchema as Record<string, any>;
    const validate = ajv.compile(schema);
    const valid = validate(parameters);

    if (!valid) {
      return {
        valid: false,
        errors: validate.errors,
      };
    }

    return {
      valid: true,
      errors: null,
    };
  }

  /**
   * Render action name from template
   */
  renderActionName(template: string, parameters: Record<string, any>): string {
    return this.renderTemplate(template, parameters);
  }

  /**
   * Render description from template
   */
  renderDescription(template: string, parameters: Record<string, any>): string {
    return this.renderTemplate(template, parameters);
  }

  /**
   * Simple template rendering ({{key}} replacement)
   */
  private renderTemplate(template: string, parameters: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return parameters[key]?.toString() || '';
    });
  }

  /**
   * Seed initial GOST templates
   */
  async seedInitialTemplates() {
    const templates: CreateTemplateParams[] = [
      // Legislative
      {
        code: 'GOST-LEG-001',
        name: 'Предложение закона',
        description: 'Law proposal template',
        powerBranch: 'LEGISLATIVE',
        parametersSchema: {
          type: 'object',
          required: ['lawTitle', 'proposedBy', 'votingDate'],
          properties: {
            lawTitle: { type: 'string' },
            proposedBy: { type: 'string' },
            votingDate: { type: 'string' },
          },
        },
        actionNameTemplate: 'Предложение закона: {{lawTitle}}',
        descriptionTemplate: 'Предложен закон "{{lawTitle}}" от {{proposedBy}}',
        applicableLevels: ['LEVEL_100', 'LEVEL_1000', 'REPUBLIC', 'CONFEDERATION'],
      },
      // Executive
      {
        code: 'GOST-EXEC-001',
        name: 'Назначение должностного лица',
        description: 'Official appointment template',
        powerBranch: 'EXECUTIVE',
        parametersSchema: {
          type: 'object',
          required: ['position', 'appointeeName', 'department'],
          properties: {
            position: { type: 'string' },
            appointeeName: { type: 'string' },
            department: { type: 'string' },
          },
        },
        actionNameTemplate: 'Назначение: {{appointeeName}} на должность {{position}}',
        descriptionTemplate: 'Утверждено назначение {{appointeeName}} в {{department}}',
        applicableLevels: ['LEVEL_1000', 'LEVEL_10000', 'REPUBLIC'],
      },
      // Judicial
      {
        code: 'GOST-JUD-001',
        name: 'Судебное решение',
        description: 'Court ruling template',
        powerBranch: 'JUDICIAL',
        parametersSchema: {
          type: 'object',
          required: ['caseNumber', 'ruling', 'judge'],
          properties: {
            caseNumber: { type: 'string' },
            ruling: { type: 'string' },
            judge: { type: 'string' },
          },
        },
        actionNameTemplate: 'Судебное решение по делу №{{caseNumber}}',
        descriptionTemplate: 'Вынесено решение "{{ruling}}". Судья: {{judge}}',
        applicableLevels: ['LEVEL_10', 'LEVEL_100', 'LEVEL_1000', 'REPUBLIC'],
      },
      // Banking
      {
        code: 'GOST-BANK-001',
        name: 'Эмиссия ALTAN',
        description: 'ALTAN emission template',
        powerBranch: 'BANKING',
        parametersSchema: {
          type: 'object',
          required: ['amount', 'recipient', 'reason'],
          properties: {
            amount: { type: 'number' },
            recipient: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        actionNameTemplate: 'Эмиссия {{amount}} ALTAN для {{recipient}}',
        descriptionTemplate: 'Выпущено {{amount}} ALTAN. Причина: {{reason}}',
        applicableLevels: ['REPUBLIC'],
      },
    ];

    for (const template of templates) {
      const existing = await this.prisma.activityTemplate.findUnique({
        where: { code: template.code },
      });

      if (!existing) {
        await this.createTemplate(template);
      } else {
        this.logger.log(`Template ${template.code} already exists, skipping`);
      }
    }

    this.logger.log('Initial GOST templates seeded');
  }
}
