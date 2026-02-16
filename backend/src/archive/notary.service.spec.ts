import { Test, TestingModule } from '@nestjs/testing';
import { NotaryService } from './notary.service';
import { DocumentContractService } from './document-contract.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('NotaryService', () => {
  let service: NotaryService;
  let prisma: any;

  const mockPrisma = () => ({
    documentContract: { findMany: jest.fn() },
    notarizationRecord: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  });

  const mockDocumentService = {
    getDocument: jest.fn(),
    advanceStage: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotaryService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: DocumentContractService, useValue: mockDocumentService },
      ],
    }).compile();
    service = module.get(NotaryService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── getPendingDocuments ───────────────
  describe('getPendingDocuments', () => {
    it('should return pending documents', async () => {
      prisma.documentContract.findMany.mockResolvedValue([{ id: 'd1' }]);
      const result = await service.getPendingDocuments();
      expect(result).toHaveLength(1);
    });
  });

  // ─── notarizeDocument ─────────────────
  describe('notarizeDocument', () => {
    it('should notarize document', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'n1', username: 'notary1', role: 'NOTARY' });
      mockDocumentService.getDocument.mockResolvedValue({
        id: 'd1', documentNumber: 'BL-001/2026', currentStage: 'PENDING_NOTARIZATION',
      });
      prisma.notarizationRecord.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.create.mockResolvedValue({
        id: 'nr-1', registryNumber: 'NR-0001/2026',
        notary: { id: 'n1', username: 'notary1', role: 'NOTARY' },
      });
      const result = await service.notarizeDocument('d1', 'n1', {
        signature: '0xsig', publicKey: '0xpub',
      });
      expect(result.registryNumber).toBe('NR-0001/2026');
      expect(mockDocumentService.advanceStage).toHaveBeenCalledWith(
        'd1', 'NOTARIZED', 'n1', expect.any(String),
      );
    });

    it('should throw for non-NOTARY role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.notarizeDocument('d1', 'u1', {
        signature: '0xsig', publicKey: '0xpub',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if document not in PENDING_NOTARIZATION', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'n1', role: 'NOTARY' });
      mockDocumentService.getDocument.mockResolvedValue({ id: 'd1', currentStage: 'DRAFT' });
      await expect(service.notarizeDocument('d1', 'n1', {
        signature: '0xsig', publicKey: '0xpub',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if already notarized', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'n1', role: 'NOTARY' });
      mockDocumentService.getDocument.mockResolvedValue({ id: 'd1', currentStage: 'PENDING_NOTARIZATION' });
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.notarizeDocument('d1', 'n1', {
        signature: '0xsig', publicKey: '0xpub',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getNotarization ──────────────────
  describe('getNotarization', () => {
    it('should return notarization record', async () => {
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'nr-1' });
      const result = await service.getNotarization('d1');
      expect(result.id).toBe('nr-1');
    });

    it('should throw NotFoundException', async () => {
      prisma.notarizationRecord.findUnique.mockResolvedValue(null);
      await expect(service.getNotarization('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getNotaryRecords ─────────────────
  describe('getNotaryRecords', () => {
    it('should return records for a notary', async () => {
      prisma.notarizationRecord.findMany.mockResolvedValue([{ id: 'nr-1' }]);
      const result = await service.getNotaryRecords('n1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── getRegistry ──────────────────────
  describe('getRegistry', () => {
    it('should return filtered registry', async () => {
      prisma.notarizationRecord.findMany.mockResolvedValue([]);
      const result = await service.getRegistry({ notaryId: 'n1' });
      expect(result).toEqual([]);
    });
  });
});
