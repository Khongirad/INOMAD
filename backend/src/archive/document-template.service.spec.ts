import { Test, TestingModule } from '@nestjs/testing';
import { DocumentTemplateService } from './document-template.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DocumentTemplateService', () => {
  let service: DocumentTemplateService;
  let prisma: any;

  const mockTemplate = {
    id: 't1', code: 'LICENSE_001', name: 'Banking License',
    version: '1.0', status: 'ACTIVE', requiredFields: ['bankName', 'amount'],
    optionalFields: ['notes'], templateSchema: {
      bankName: { type: 'string', minLength: 3 },
      amount: { type: 'number', minimum: 0 },
      status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
    },
    validationRules: {
      conditionalRequired: [
        { ifField: 'status', ifValue: 'ACTIVE', thenRequire: 'bankName' },
      ],
    },
  };

  const mockPrisma = () => ({
    user: { findUnique: jest.fn() },
    documentTemplate: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentTemplateService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(DocumentTemplateService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createTemplate ─────────────────────
  describe('createTemplate', () => {
    it('should create template as CREATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CREATOR' });
      prisma.documentTemplate.create.mockResolvedValue(mockTemplate);
      const result = await service.createTemplate('admin', {
        code: 'LICENSE_001', name: 'Banking License', category: 'Banking',
        templateSchema: {}, requiredFields: ['bankName'], optionalFields: [],
        contentTemplate: 'Template {{bankName}}',
        requiredSignatures: ['GOVERNOR'], stagesRequired: ['DRAFT'],
      });
      expect(result.code).toBe('LICENSE_001');
    });

    it('should throw BadRequestException for unauthorized role', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
      await expect(service.createTemplate('user', {
        code: 'X', name: 'X', category: 'X', templateSchema: {},
        requiredFields: [], optionalFields: [], contentTemplate: '',
        requiredSignatures: [], stagesRequired: [],
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getTemplate ────────────────────────
  describe('getTemplate', () => {
    it('should return template by code', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      const result = await service.getTemplate('LICENSE_001');
      expect(result.code).toBe('LICENSE_001');
    });

    it('should throw NotFoundException', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(null);
      await expect(service.getTemplate('BAD')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listTemplates ──────────────────────
  describe('listTemplates', () => {
    it('should list active templates', async () => {
      prisma.documentTemplate.findMany.mockResolvedValue([mockTemplate]);
      const result = await service.listTemplates();
      expect(result).toHaveLength(1);
    });

    it('should filter by category', async () => {
      prisma.documentTemplate.findMany.mockResolvedValue([mockTemplate]);
      await service.listTemplates('Banking');
      expect(prisma.documentTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ category: 'Banking' }),
      }));
    });
  });

  // ─── validateVariables ──────────────────
  describe('validateVariables', () => {
    it('should pass valid variables', () => {
      const result = service.validateVariables(mockTemplate, { bankName: 'Bank A', amount: 1000 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing required field', () => {
      const result = service.validateVariables(mockTemplate, { amount: 1000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: bankName');
    });

    it('should fail for wrong type (number expected)', () => {
      const result = service.validateVariables(mockTemplate, { bankName: 'X', amount: 'not-a-number' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'amount' must be a number");
    });

    it('should fail for invalid enum value', () => {
      const result = service.validateVariables(mockTemplate, { bankName: 'BankName', amount: 1, status: 'UNKNOWN' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("must be one of");
    });

    it('should fail for string too short', () => {
      const result = service.validateVariables(mockTemplate, { bankName: 'AB', amount: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at least 3 characters');
    });

    it('should fail for number below minimum', () => {
      const result = service.validateVariables(mockTemplate, { bankName: 'Bank', amount: -5 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('>= 0');
    });

    it('should validate conditional required fields', () => {
      const result = service.validateVariables(mockTemplate, { amount: 1, status: 'ACTIVE' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Field 'bankName' is required when status is ACTIVE");
    });
  });

  // ─── renderTemplate ─────────────────────
  describe('renderTemplate', () => {
    it('should render Mustache-style template', () => {
      const result = service.renderTemplate('License for {{ bankName }} issued on {{ date }}', {
        bankName: 'Alpha Bank', date: '2026-01-01',
      });
      expect(result).toContain('Alpha Bank');
      expect(result).toContain('2026-01-01');
    });

    it('should replace missing vars with empty string', () => {
      const result = service.renderTemplate('Hello {{name}}', {});
      expect(result).toBe('Hello {{name}}');
    });
  });

  // ─── updateTemplate ─────────────────────
  describe('updateTemplate', () => {
    it('should update and bump version', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.documentTemplate.update.mockResolvedValue({ ...mockTemplate, version: '1.1' });
      const result = await service.updateTemplate('LICENSE_001', 'admin', { contentTemplate: 'New' });
      expect(result.version).toBe('1.1');
    });
  });

  // ─── deprecateTemplate ──────────────────
  describe('deprecateTemplate', () => {
    it('should deprecate template', async () => {
      prisma.documentTemplate.update.mockResolvedValue({ ...mockTemplate, status: 'DEPRECATED' });
      const result = await service.deprecateTemplate('LICENSE_001', 'admin');
      expect(result.status).toBe('DEPRECATED');
    });
  });

  // ─── validateVariables additional types ──
  describe('validateVariables (additional types)', () => {
    it('should validate date type', () => {
      const template = {
        ...mockTemplate,
        requiredFields: ['startDate'],
        templateSchema: { startDate: { type: 'date' } },
      };
      const result = service.validateVariables(template, { startDate: '2026-01-01' });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid date', () => {
      const template = {
        ...mockTemplate,
        requiredFields: ['startDate'],
        templateSchema: { startDate: { type: 'date' } },
      };
      const result = service.validateVariables(template, { startDate: 'not-a-date' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('valid date');
    });

    it('should validate boolean type', () => {
      const template = {
        ...mockTemplate,
        requiredFields: ['active'],
        templateSchema: { active: { type: 'boolean' } },
      };
      const result = service.validateVariables(template, { active: true });
      expect(result.valid).toBe(true);
    });

    it('should fail for wrong boolean type', () => {
      const template = {
        ...mockTemplate,
        requiredFields: ['active'],
        templateSchema: { active: { type: 'boolean' } },
      };
      const result = service.validateVariables(template, { active: 'yes' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('boolean');
    });

    it('should fail for string exceeding maxLength', () => {
      const template = {
        ...mockTemplate,
        requiredFields: ['name'],
        templateSchema: { name: { type: 'string', maxLength: 5 } },
      };
      const result = service.validateVariables(template, { name: 'TooLongName' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('at most 5');
    });

    it('should pass with schema having no validationRules', () => {
      const template = {
        ...mockTemplate,
        requiredFields: ['bankName'],
        validationRules: null,
      };
      const result = service.validateVariables(template, { bankName: 'Bank', amount: 1 });
      expect(result.valid).toBe(true);
    });
  });

  // ─── createTemplate as ADMIN ─────────────
  describe('createTemplate as ARCHIVIST', () => {
    it('should create template as ARCHIVIST role', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'ARCHIVIST' });
      prisma.documentTemplate.create.mockResolvedValue(mockTemplate);
      const result = await service.createTemplate('admin2', {
        code: 'TAX_001', name: 'Tax Form', category: 'Tax',
        templateSchema: {}, requiredFields: [], optionalFields: [],
        contentTemplate: 'Tax template', requiredSignatures: [], stagesRequired: [],
      });
      expect(result.code).toBe('LICENSE_001');
    });
  });

  // ─── updateTemplate edge case ────────────
  describe('updateTemplate edge cases', () => {
    it('should throw when template not found', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(null);
      await expect(service.updateTemplate('BAD', 'admin', { contentTemplate: 'X' }))
        .rejects.toThrow(NotFoundException);
    });
  });
});

