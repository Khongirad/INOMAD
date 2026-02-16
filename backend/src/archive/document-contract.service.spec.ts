import { Test, TestingModule } from '@nestjs/testing';
import { DocumentContractService } from './document-contract.service';
import { DocumentTemplateService } from './document-template.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DocumentContractService', () => {
  let service: DocumentContractService;
  let prisma: any;
  let templateService: any;

  const mockTemplate = {
    id: 't1', code: 'BL_001', name: 'Banking License', version: '1.0',
    contentTemplate: 'License for {{bankName}}', requiredFields: ['bankName'],
    templateSchema: { bankName: { type: 'string' } },
  };

  const mockDocument = {
    id: 'd1', documentNumber: 'BL-001/2026', title: 'Test License',
    currentStage: 'DRAFT', status: 'ACTIVE', generatedContent: 'License for Alpha',
    template: mockTemplate,
    issuer: { id: 'u1', username: 'admin', role: 'CREATOR' },
    recipient: null, signatures: [], stages: [], notarization: null, legalCert: null,
  };

  const mockPrisma = () => ({
    documentContract: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
    },
    documentStageHistory: { create: jest.fn().mockResolvedValue({}) },
    documentSignature: { create: jest.fn() },
    documentAccessLog: { create: jest.fn() },
    user: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentContractService,
        { provide: PrismaService, useFactory: mockPrisma },
        {
          provide: DocumentTemplateService,
          useValue: {
            getTemplate: jest.fn().mockResolvedValue(mockTemplate),
            validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
            renderTemplate: jest.fn().mockReturnValue('License for Alpha Bank'),
          },
        },
      ],
    }).compile();
    service = module.get(DocumentContractService);
    prisma = module.get(PrismaService);
    templateService = module.get(DocumentTemplateService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createDocument ────────────────────
  describe('createDocument', () => {
    it('should create document from template', async () => {
      prisma.documentContract.create.mockResolvedValue(mockDocument);
      const result = await service.createDocument({
        templateCode: 'BL_001', issuerId: 'u1', title: 'Test License',
        variables: { bankName: 'Alpha Bank' },
      });
      expect(result.documentNumber).toBe('BL-001/2026');
      expect(templateService.validateVariables).toHaveBeenCalled();
    });

    it('should throw for invalid variables', async () => {
      templateService.validateVariables.mockReturnValue({ valid: false, errors: ['Missing bankName'] });
      await expect(service.createDocument({
        templateCode: 'BL_001', issuerId: 'u1', title: 'Bad',
        variables: {},
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getDocument ───────────────────────
  describe('getDocument', () => {
    it('should return document with relations', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument);
      const result = await service.getDocument('d1');
      expect(result.id).toBe('d1');
    });

    it('should throw NotFoundException', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(null);
      await expect(service.getDocument('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getDocumentByNumber ───────────────
  describe('getDocumentByNumber', () => {
    it('should return document by number', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument);
      const result = await service.getDocumentByNumber('BL-001/2026');
      expect(result.documentNumber).toBe('BL-001/2026');
    });

    it('should throw NotFoundException', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(null);
      await expect(service.getDocumentByNumber('MISSING')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── advanceStage ─────────────────────
  describe('advanceStage', () => {
    it('should advance from DRAFT to PENDING_REVIEW', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument);
      prisma.documentContract.update.mockResolvedValue({ ...mockDocument, currentStage: 'PENDING_REVIEW' });
      const result = await service.advanceStage('d1', 'PENDING_REVIEW' as any, 'u1');
      expect(result.currentStage).toBe('PENDING_REVIEW');
    });

    it('should throw for invalid transition', async () => {
      // DRAFT → ARCHIVED is not valid
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument);
      await expect(service.advanceStage('d1', 'ARCHIVED' as any, 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── signDocument ─────────────────────
  describe('signDocument', () => {
    it('should sign document and advance stage from DRAFT', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CREATOR' });
      prisma.documentSignature.create.mockResolvedValue({
        id: 'sig-1', signer: { id: 'u1', username: 'admin', role: 'CREATOR' },
      });
      // getDocument for stage check
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument);
      prisma.documentContract.update.mockResolvedValue({ ...mockDocument, currentStage: 'SIGNED' });
      const result = await service.signDocument('d1', 'u1', 'CB_GOVERNOR' as any, '0xsig', '0xpub');
      expect(result.id).toBe('sig-1');
    });
  });

  // ─── submitForNotarization ────────────
  describe('submitForNotarization', () => {
    it('should submit SIGNED document for notarization', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({ ...mockDocument, currentStage: 'SIGNED' });
      prisma.documentContract.update.mockResolvedValue({ currentStage: 'PENDING_NOTARIZATION' });
      const result = await service.submitForNotarization('d1', 'u1');
      expect(result.currentStage).toBe('PENDING_NOTARIZATION');
    });

    it('should throw if not SIGNED', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument); // DRAFT
      await expect(service.submitForNotarization('d1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── archiveDocument ──────────────────
  describe('archiveDocument', () => {
    it('should archive CERTIFIED document', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({ ...mockDocument, currentStage: 'CERTIFIED' });
      prisma.documentContract.update.mockResolvedValue({ currentStage: 'ARCHIVED' });
      const result = await service.archiveDocument('d1', 'u1', 'ARC-001');
      expect(result.currentStage).toBe('ARCHIVED');
    });

    it('should throw if not CERTIFIED', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(mockDocument); // DRAFT
      await expect(service.archiveDocument('d1', 'u1', 'ARC-001')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── logAccess ────────────────────────
  describe('logAccess', () => {
    it('should log access', async () => {
      prisma.documentAccessLog.create.mockResolvedValue({ id: 'log-1' });
      const result = await service.logAccess({
        documentId: 'd1', userId: 'u1', action: 'VIEW', ipAddress: '1.2.3.4',
      });
      expect(result.id).toBe('log-1');
    });
  });

  // ─── listDocuments ────────────────────
  describe('listDocuments', () => {
    it('should list documents with filters', async () => {
      prisma.documentContract.findMany.mockResolvedValue([mockDocument]);
      const result = await service.listDocuments({ stage: 'DRAFT' as any });
      expect(result).toHaveLength(1);
    });
  });
});
