import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LegalService } from './legal.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentContractService } from './document-contract.service';

describe('LegalService', () => {
  let service: LegalService;
  let prisma: any;
  let documentService: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      documentContract: { findMany: jest.fn().mockResolvedValue([]) },
      legalCertification: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      notarizationRecord: { findUnique: jest.fn() },
    };

    documentService = {
      getDocument: jest.fn(),
      advanceStage: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentContractService, useValue: documentService },
      ],
    }).compile();

    service = module.get<LegalService>(LegalService);
  });

  describe('certifyDocument', () => {
    const certData = {
      opinion: 'Legally sound', compliant: true,
      signature: '0xSIG', publicKey: '0xPUB',
    };

    it('should reject non-lawyer user', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
      await expect(service.certifyDocument('doc-1', 'u1', certData)).rejects.toThrow(BadRequestException);
    });

    it('should reject if not in PENDING_LEGAL stage', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'l1', role: 'STATE_LAWYER', username: 'lawyer1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'DRAFT' });
      await expect(service.certifyDocument('doc-1', 'l1', certData)).rejects.toThrow(BadRequestException);
    });

    it('should reject already certified document', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'l1', role: 'STATE_LAWYER', username: 'lawyer1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'PENDING_LEGAL' });
      prisma.legalCertification.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.certifyDocument('doc-1', 'l1', certData)).rejects.toThrow(BadRequestException);
    });

    it('should reject document without notarization', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'l1', role: 'STATE_LAWYER', username: 'lawyer1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'PENDING_LEGAL', documentNumber: 'DOC-001' });
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.findUnique.mockResolvedValue(null);
      await expect(service.certifyDocument('doc-1', 'l1', certData)).rejects.toThrow(BadRequestException);
    });

    it('should certify and advance stage when compliant', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'l1', role: 'STATE_LAWYER', username: 'lawyer1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'PENDING_LEGAL', documentNumber: 'DOC-001' });
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'not-1' });
      prisma.legalCertification.create.mockResolvedValue({ id: 'cert-1' });

      const result = await service.certifyDocument('doc-1', 'l1', certData);
      expect(result.id).toBe('cert-1');
      expect(documentService.advanceStage).toHaveBeenCalled();
    });

    it('should not advance stage when non-compliant', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'l1', role: 'STATE_LAWYER', username: 'lawyer1' });
      documentService.getDocument.mockResolvedValue({ currentStage: 'PENDING_LEGAL', documentNumber: 'DOC-001' });
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      prisma.notarizationRecord.findUnique.mockResolvedValue({ id: 'not-1' });
      prisma.legalCertification.create.mockResolvedValue({ id: 'cert-2' });

      await service.certifyDocument('doc-1', 'l1', { ...certData, compliant: false });
      expect(documentService.advanceStage).not.toHaveBeenCalled();
    });
  });

  describe('getCertification', () => {
    it('should throw NotFoundException when missing', async () => {
      prisma.legalCertification.findUnique.mockResolvedValue(null);
      await expect(service.getCertification('doc-1')).rejects.toThrow(NotFoundException);
    });

    it('should return certification', async () => {
      prisma.legalCertification.findUnique.mockResolvedValue({ id: 'cert-1' });
      const result = await service.getCertification('doc-1');
      expect(result.id).toBe('cert-1');
    });
  });

  describe('getPendingDocuments', () => {
    it('should query for PENDING_LEGAL documents', async () => {
      await service.getPendingDocuments();
      expect(prisma.documentContract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { currentStage: 'PENDING_LEGAL' } }),
      );
    });
  });

  describe('getLawyerCertifications', () => {
    it('should return certifications for lawyer', async () => {
      prisma.legalCertification.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.getLawyerCertifications('l1');
      expect(result).toHaveLength(1);
    });
  });
});
