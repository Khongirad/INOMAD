import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotaryService } from './notary.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentContractService } from './document-contract.service';

describe('NotaryService', () => {
  let service: NotaryService;
  let prisma: any;
  let documentService: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      notarizationRecord: {
        count: jest.fn().mockResolvedValue(5),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      documentContract: {
        findMany: jest.fn(),
      },
    };

    documentService = {
      getDocument: jest.fn(),
      advanceStage: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentContractService, useValue: documentService },
      ],
    }).compile();

    service = module.get<NotaryService>(NotaryService);
  });

  describe('notarizeDocument', () => {
    const notaryData = {
      signature: '0xSIG',
      publicKey: '0xPUB',
      notes: 'Verified',
    };

    it('should reject non-notary user', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
      await expect(
        service.notarizeDocument('doc-1', 'user-1', notaryData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject document not in PENDING_NOTARIZATION', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'n1', role: 'NOTARY', username: 'notary1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'DRAFT' });

      await expect(
        service.notarizeDocument('doc-1', 'n1', notaryData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject already notarized document', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'n1', role: 'NOTARY', username: 'notary1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'PENDING_NOTARIZATION' });
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.notarizeDocument('doc-1', 'n1', notaryData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create notarization and advance stage', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'n1', role: 'NOTARY', username: 'notary1' });
      documentService.getDocument.mockResolvedValue({
        currentStage: 'PENDING_NOTARIZATION',
        documentNumber: 'DOC-001',
      });
      prisma.notarizationRecord.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.create.mockResolvedValue({ id: 'rec-1', registryNumber: 'NR-0006/2026' });

      const result = await service.notarizeDocument('doc-1', 'n1', notaryData);
      expect(result.id).toBe('rec-1');
      expect(documentService.advanceStage).toHaveBeenCalledWith(
        'doc-1',
        'NOTARIZED',
        'n1',
        expect.stringContaining('notary1'),
      );
    });
  });

  describe('getNotarization', () => {
    it('should throw NotFoundException when missing', async () => {
      prisma.notarizationRecord.findUnique.mockResolvedValue(null);
      await expect(service.getNotarization('doc-1')).rejects.toThrow(NotFoundException);
    });

    it('should return notarization record', async () => {
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'rec-1', documentId: 'doc-1' });
      const result = await service.getNotarization('doc-1');
      expect(result.id).toBe('rec-1');
    });
  });

  describe('getPendingDocuments', () => {
    it('should query for PENDING_NOTARIZATION documents', async () => {
      prisma.documentContract.findMany.mockResolvedValue([]);
      await service.getPendingDocuments();
      expect(prisma.documentContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { currentStage: 'PENDING_NOTARIZATION' },
        }),
      );
    });
  });

  describe('getNotaryRecords', () => {
    it('should return records for notary', async () => {
      prisma.notarizationRecord.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.getNotaryRecords('n1');
      expect(result).toHaveLength(1);
    });
  });
});
