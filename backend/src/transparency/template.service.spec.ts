import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let prisma: any;

  const mockTemplate = {
    id: 't1', code: 'GOST-LEG-001', name: 'Law Proposal',
    description: 'Template for law proposals',
    powerBranch: 'LEGISLATIVE', isActive: true,
    parametersSchema: {
      type: 'object',
      required: ['lawTitle'],
      properties: { lawTitle: { type: 'string' } },
    },
    actionNameTemplate: 'Law: {{lawTitle}}',
    descriptionTemplate: 'Proposed {{lawTitle}}',
    applicableLevels: ['LEVEL_100', 'REPUBLIC'],
  };

  beforeEach(async () => {
    const mockPrisma = {
      activityTemplate: {
        create: jest.fn().mockResolvedValue(mockTemplate),
        findMany: jest.fn().mockResolvedValue([mockTemplate]),
        findUnique: jest.fn().mockResolvedValue(mockTemplate),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TemplateService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createTemplate', () => {
    it('creates template', async () => {
      const r = await service.createTemplate({
        code: 'GOST-LEG-001', name: 'Law Proposal',
        description: 'Template', powerBranch: 'LEGISLATIVE' as any,
        parametersSchema: { type: 'object' },
        actionNameTemplate: '{{title}}',
        descriptionTemplate: '{{desc}}',
        applicableLevels: ['LEVEL_100' as any],
      });
      expect(r.code).toBe('GOST-LEG-001');
    });
  });

  describe('getTemplates', () => {
    it('returns all active templates', async () => {
      const r = await service.getTemplates();
      expect(r).toHaveLength(1);
    });
    it('filters by power branch', async () => {
      await service.getTemplates('LEGISLATIVE' as any);
      expect(prisma.activityTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ powerBranch: 'LEGISLATIVE' }),
        }),
      );
    });
    it('filters inactive', async () => {
      await service.getTemplates(undefined, false);
      expect(prisma.activityTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('getTemplateByCode', () => {
    it('returns template by code', async () => {
      const r = await service.getTemplateByCode('GOST-LEG-001');
      expect(r!.code).toBe('GOST-LEG-001');
    });
  });

  describe('validateActivity', () => {
    it('validates valid parameters', async () => {
      const r = await service.validateActivity('t1', { lawTitle: 'Test Law' });
      expect(r.valid).toBe(true);
      expect(r.errors).toBeNull();
    });
    it('returns errors for invalid parameters', async () => {
      const r = await service.validateActivity('t1', { });
      expect(r.valid).toBe(false);
      expect(r.errors).toBeDefined();
    });
    it('throws when template not found', async () => {
      prisma.activityTemplate.findUnique.mockResolvedValue(null);
      await expect(service.validateActivity('bad', {})).rejects.toThrow('not found');
    });
  });

  describe('renderActionName', () => {
    it('renders template with parameters', () => {
      const r = service.renderActionName('Law: {{lawTitle}}', { lawTitle: 'Tax Reform' });
      expect(r).toBe('Law: Tax Reform');
    });
    it('replaces missing keys with empty string', () => {
      const r = service.renderActionName('{{missing}} item', {});
      expect(r).toBe(' item');
    });
  });

  describe('renderDescription', () => {
    it('renders description template', () => {
      const r = service.renderDescription('Proposed {{lawTitle}}', { lawTitle: 'Budget Act' });
      expect(r).toBe('Proposed Budget Act');
    });
  });

  describe('seedInitialTemplates', () => {
    it('seeds templates when none exist', async () => {
      prisma.activityTemplate.findUnique.mockResolvedValue(null);
      await service.seedInitialTemplates();
      expect(prisma.activityTemplate.create).toHaveBeenCalledTimes(4);
    });
    it('skips existing templates', async () => {
      await service.seedInitialTemplates();
      expect(prisma.activityTemplate.create).not.toHaveBeenCalled();
    });
  });
});
