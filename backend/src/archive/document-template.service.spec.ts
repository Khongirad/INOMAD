import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentTemplateService } from './document-template.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DocumentTemplateService', () => {
  let service: DocumentTemplateService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      documentTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentTemplateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DocumentTemplateService>(DocumentTemplateService);
  });

  describe('getTemplate', () => {
    it('should throw NotFoundException for missing template', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(null);
      await expect(service.getTemplate('BAD')).rejects.toThrow(NotFoundException);
    });

    it('should return template by code', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue({
        id: 'tpl-1', code: 'BL', name: 'Banking License',
      });
      const result = await service.getTemplate('BL');
      expect(result.code).toBe('BL');
    });
  });

  describe('listTemplates', () => {
    it('should list all active templates', async () => {
      await service.listTemplates();
      expect(prisma.documentTemplate.findMany).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      await service.listTemplates('BANKING');
      expect(prisma.documentTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: 'BANKING' }) }),
      );
    });
  });

  describe('renderTemplate', () => {
    it('should replace variables', () => {
      const result = service.renderTemplate('Hello {{name}}, welcome to {{org}}', {
        name: 'Bair', org: 'INOMAD',
      });
      expect(result).toBe('Hello Bair, welcome to INOMAD');
    });

    it('should leave unreplaced placeholders', () => {
      const result = service.renderTemplate('Hello {{name}}', {});
      expect(result).toContain('{{name}}');
    });
  });
});
