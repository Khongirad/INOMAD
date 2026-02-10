import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TemplateService', () => {
  let service: TemplateService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activityTemplate: {
        create: jest.fn().mockResolvedValue({ id: 't1', code: 'GOST-001' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<TemplateService>(TemplateService);
  });

  it('createTemplate creates a template', async () => {
    const r = await service.createTemplate({
      code: 'TEST', name: 'Test', description: 'desc',
      powerBranch: 'LEGISLATIVE' as any, parametersSchema: {},
      actionNameTemplate: '{{name}}', descriptionTemplate: '{{desc}}',
      applicableLevels: ['LEVEL_1'] as any,
    });
    expect(r.code).toBe('GOST-001');
  });

  it('getTemplates returns list', async () => {
    await service.getTemplates();
    expect(prisma.activityTemplate.findMany).toHaveBeenCalled();
  });

  it('getTemplateByCode queries by code', async () => {
    prisma.activityTemplate.findUnique.mockResolvedValue({ code: 'X' });
    const r = await service.getTemplateByCode('X');
    expect(r.code).toBe('X');
  });

  it('renderActionName replaces placeholders', () => {
    const r = service.renderActionName('Hello {{name}}', { name: 'World' });
    expect(r).toBe('Hello World');
  });

  it('renderDescription replaces placeholders', () => {
    const r = service.renderDescription('Desc: {{val}}', { val: '123' });
    expect(r).toBe('Desc: 123');
  });
});
