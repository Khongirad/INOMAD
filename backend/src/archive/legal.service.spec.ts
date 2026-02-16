import { Test, TestingModule } from '@nestjs/testing';
import { LegalService } from './legal.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentContractService } from './document-contract.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentStage } from '@prisma/client';

describe('LegalService', () => {
  let service: LegalService;
  let prisma: any;
  let documentService: any;

  const mockPrisma = () => ({
    documentContract: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
    legalCertification: {
      findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    },
    notarizationRecord: { findUnique: jest.fn() },
  });

  const mockDocumentService = () => ({
    getDocument: jest.fn(),
    advanceStage: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: DocumentContractService, useFactory: mockDocumentService },
      ],
    }).compile();
    service = module.get(LegalService);
    prisma = module.get(PrismaService);
    documentService = module.get(DocumentContractService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getPendingDocuments', () => {
    it('should return pending legal docs', async () => {
      prisma.documentContract.findMany.mockResolvedValue([{ id: 'd1' }]);
      const result = await service.getPendingDocuments();
      expect(result).toHaveLength(1);
    });
  });

  describe('certifyDocument', () => {
    const certData = {
      opinion: 'Compliant with law', compliant: true,
      signature: 'sig', publicKey: 'pk',
    };

    it('should throw if not a state lawyer', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
      await expect(service.certifyDocument('d1', 'u1', certData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.certifyDocument('d1', 'u1', certData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if not in PENDING_LEGAL stage', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'lawyer', role: 'STATE_LAWYER' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'DRAFT' });
      await expect(service.certifyDocument('d1', 'u1', certData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if already certified', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'lawyer', role: 'STATE_LAWYER' });
      documentService.getDocument.mockResolvedValue({ currentStage: DocumentStage.PENDING_LEGAL });
      prisma.legalCertification.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.certifyDocument('d1', 'u1', certData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if not notarized', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'lawyer', role: 'STATE_LAWYER' });
      documentService.getDocument.mockResolvedValue({ currentStage: DocumentStage.PENDING_LEGAL });
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.findUnique.mockResolvedValue(null);
      await expect(service.certifyDocument('d1', 'u1', certData))
        .rejects.toThrow(BadRequestException);
    });

    it('should certify compliant document and advance stage', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'lawyer', role: 'STATE_LAWYER' });
      documentService.getDocument.mockResolvedValue({
        currentStage: DocumentStage.PENDING_LEGAL, documentNumber: 'DOC-001',
      });
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'n1' });
      prisma.legalCertification.create.mockResolvedValue({ id: 'c1', compliant: true });
      const result = await service.certifyDocument('d1', 'u1', certData);
      expect(result.compliant).toBe(true);
      expect(documentService.advanceStage).toHaveBeenCalledWith(
        'd1', DocumentStage.CERTIFIED, 'u1', expect.any(String),
      );
    });

    it('should not advance stage for non-compliant', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'lawyer', role: 'STATE_LAWYER' });
      documentService.getDocument.mockResolvedValue({
        currentStage: DocumentStage.PENDING_LEGAL, documentNumber: 'DOC-001',
      });
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'n1' });
      prisma.legalCertification.create.mockResolvedValue({ id: 'c1', compliant: false });
      await service.certifyDocument('d1', 'u1', { ...certData, compliant: false });
      expect(documentService.advanceStage).not.toHaveBeenCalled();
    });
  });

  describe('getCertification', () => {
    it('should return certification', async () => {
      prisma.legalCertification.findUnique.mockResolvedValue({ id: 'c1' });
      const result = await service.getCertification('d1');
      expect(result.id).toBe('c1');
    });

    it('should throw if not found', async () => {
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      await expect(service.getCertification('d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLawyerCertifications', () => {
    it('should return certifications', async () => {
      prisma.legalCertification.findMany.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.getLawyerCertifications('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getOpinions', () => {
    it('should filter by compliant flag', async () => {
      prisma.legalCertification.findMany.mockResolvedValue([]);
      await service.getOpinions({ compliant: true });
      expect(prisma.legalCertification.findMany).toHaveBeenCalled();
    });
  });
});
