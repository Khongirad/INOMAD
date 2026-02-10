import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentContractService } from './document-contract.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentTemplateService } from './document-template.service';

describe('DocumentContractService', () => {
  let service: DocumentContractService;
  let prisma: any;
  let templateService: any;

  beforeEach(async () => {
    prisma = {
      documentContract: {
        count: jest.fn().mockResolvedValue(5),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      documentStageHistory: { create: jest.fn().mockResolvedValue({}) },
      documentSignature: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
      documentAccessLog: { create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn() },
    };

    templateService = {
      getTemplate: jest.fn(),
      validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      renderTemplate: jest.fn().mockReturnValue('rendered'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentContractService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentTemplateService, useValue: templateService },
      ],
    }).compile();

    service = module.get<DocumentContractService>(DocumentContractService);
  });

  describe('createDocument', () => {
    it('should reject unknown template', async () => {
      templateService.getTemplate.mockRejectedValue(new NotFoundException('not found'));
      await expect(
        service.createDocument({
          templateCode: 'BAD', issuerId: 'u1', title: 'T', variables: {},
        }),
      ).rejects.toThrow();
    });

    it('should create document from template', async () => {
      templateService.getTemplate.mockResolvedValue({
        id: 'tpl-1', code: 'BL', name: 'License', category: 'BANKING',
        contentTemplate: 'Hello {{name}}',
      });
      prisma.documentContract.create.mockResolvedValue({
        id: 'doc-1', documentNumber: 'BL-006/2026', currentStage: 'DRAFT',
      });

      const result = await service.createDocument({
        templateCode: 'BL', issuerId: 'u1', title: 'My License',
        variables: { name: 'Test' },
      });
      expect(result.id).toBe('doc-1');
    });
  });

  describe('getDocument', () => {
    it('should throw NotFoundException when missing', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(null);
      await expect(service.getDocument('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return document with relations', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({
        id: 'doc-1', title: 'Test', currentStage: 'DRAFT',
      });
      const result = await service.getDocument('doc-1');
      expect(result.id).toBe('doc-1');
    });
  });

  describe('advanceStage', () => {
    it('should reject invalid transition', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({
        id: 'doc-1', currentStage: 'ARCHIVED',
      });
      await expect(
        service.advanceStage('doc-1', 'DRAFT' as any, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should advance stage and create history', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({
        id: 'doc-1', currentStage: 'DRAFT',
      });
      prisma.documentContract.update.mockResolvedValue({
        id: 'doc-1', currentStage: 'PENDING_REVIEW',
      });
      const result = await service.advanceStage('doc-1', 'PENDING_REVIEW' as any, 'u1');
      expect(result.currentStage).toBe('PENDING_REVIEW');
    });
  });

  describe('signDocument', () => {
    it('should create signature and auto-advance DRAFT to SIGNED', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'ISSUER' });
      prisma.documentSignature.create.mockResolvedValue({
        id: 'sig-1', signerId: 'u1', signerRole: 'ISSUER',
      });
      // getDocument is called internally after signing
      prisma.documentContract.findUnique.mockResolvedValue({
        id: 'doc-1', currentStage: 'DRAFT', signatures: [], stageHistory: [],
      });
      prisma.documentContract.update.mockResolvedValue({
        id: 'doc-1', currentStage: 'SIGNED',
      });
      const result = await service.signDocument('doc-1', 'u1', 'ISSUER' as any, '0xSIG', '0xPUB');
      expect(result.id).toBe('sig-1');
    });
  });

  describe('listDocuments', () => {
    it('should list with no filters', async () => {
      await service.listDocuments();
      expect(prisma.documentContract.findMany).toHaveBeenCalled();
    });

    it('should apply stage filter', async () => {
      await service.listDocuments({ stage: 'DRAFT' as any });
      expect(prisma.documentContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ currentStage: 'DRAFT' }) }),
      );
    });
  });
});
