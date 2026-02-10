import { Test, TestingModule } from '@nestjs/testing';
import { TemplateSeederService } from './template-seeder.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentTemplateService } from './document-template.service';

describe('TemplateSeederService', () => {
  let service: TemplateSeederService;
  let prisma: any;
  let templateService: any;

  beforeEach(async () => {
    prisma = {
      documentTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    templateService = {
      createTemplate: jest.fn().mockResolvedValue({ id: 'tpl-1', code: 'TEST' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateSeederService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentTemplateService, useValue: templateService },
      ],
    }).compile();

    service = module.get<TemplateSeederService>(TemplateSeederService);
  });

  describe('seedTemplates', () => {
    it('should seed all templates when none exist', async () => {
      await service.seedTemplates('creator-1');
      // 3 templates: BANKING_LICENSE_001, EMISSION_PROTOCOL_001, CORRESPONDENT_ACCOUNT_001
      expect(templateService.createTemplate).toHaveBeenCalledTimes(3);
    });

    it('should skip already existing templates', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue({ id: 'existing' });
      await service.seedTemplates('creator-1');
      expect(templateService.createTemplate).not.toHaveBeenCalled();
    });

    it('should create templates with correct codes', async () => {
      await service.seedTemplates('creator-1');
      const calls = templateService.createTemplate.mock.calls;
      const codes = calls.map((c: any) => c[1].code);
      expect(codes).toContain('BANKING_LICENSE_001');
      expect(codes).toContain('EMISSION_PROTOCOL_001');
      expect(codes).toContain('CORRESPONDENT_ACCOUNT_001');
    });
  });
});
