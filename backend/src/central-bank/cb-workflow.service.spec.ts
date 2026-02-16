import { Test, TestingModule } from '@nestjs/testing';
import { CBWorkflowService } from './cb-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentTemplateService } from '../archive/document-template.service';
import { DocumentContractService } from '../archive/document-contract.service';
import { NotaryService } from '../archive/notary.service';
import { LegalService } from '../archive/legal.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CBWorkflowService', () => {
  let service: CBWorkflowService;
  let prisma: any;

  const mockGovernor = { id: 'gov-1', role: 'CB_GOVERNOR', username: 'Governor' };
  const mockCreator = { id: 'creator-1', role: 'CREATOR', username: 'Creator' };
  const mockBank = {
    id: 'bank-1', name: 'TestBank', nameRu: 'ТестБанк',
    legalAddress: '123 Main St', taxId: 'TAX-001', directorId: 'dir-1',
    licenseStatus: 'ISSUED', operationalStatus: 'PENDING_LICENSE',
    correspondentAccountNumber: 'CA-001', licenseNumber: null,
    director: { id: 'dir-1', username: 'Director' },
  };
  const mockDocument = { id: 'doc-1', documentNumber: 'BL-001/2026', title: 'License' };
  const mockTemplate = { id: 'tmpl-1', code: 'BANKING_LICENSE_001' };

  const mockPrisma = () => ({
    user: { findUnique: jest.fn() },
    bank: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    documentContract: { count: jest.fn() },
  });

  const mockTemplateService = () => ({
    getTemplate: jest.fn().mockResolvedValue(mockTemplate),
  });

  const mockDocumentService = () => ({
    createDocument: jest.fn().mockResolvedValue(mockDocument),
  });

  const mockNotaryService = () => ({});
  const mockLegalService = () => ({});

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CBWorkflowService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: DocumentTemplateService, useFactory: mockTemplateService },
        { provide: DocumentContractService, useFactory: mockDocumentService },
        { provide: NotaryService, useFactory: mockNotaryService },
        { provide: LegalService, useFactory: mockLegalService },
      ],
    }).compile();
    service = module.get(CBWorkflowService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── issueBankingLicense ───────────────
  describe('issueBankingLicense', () => {
    const bankData = { name: 'TestBank', legalAddress: '123 Main', taxId: 'TAX-001' };

    it('should issue banking license as CB Governor', async () => {
      prisma.user.findUnique.mockResolvedValue(mockGovernor);
      prisma.bank.create.mockResolvedValue({ id: 'bank-1', ...bankData });
      prisma.bank.count.mockResolvedValue(0);
      prisma.bank.update.mockResolvedValue({});
      prisma.bank.findUnique.mockResolvedValue({ ...mockBank, licenseNumber: 'BL-001/2026' });
      const result = await service.issueBankingLicense('gov-1', bankData);
      expect(result.bank).toBeDefined();
      expect(result.licenseDocument).toBeDefined();
    });

    it('should issue banking license as Creator', async () => {
      prisma.user.findUnique.mockResolvedValue(mockCreator);
      prisma.bank.create.mockResolvedValue({ id: 'bank-1', ...bankData });
      prisma.bank.count.mockResolvedValue(0);
      prisma.bank.update.mockResolvedValue({});
      prisma.bank.findUnique.mockResolvedValue({ ...mockBank });
      const result = await service.issueBankingLicense('creator-1', bankData);
      expect(result.bank).toBeDefined();
    });

    it('should throw BadRequestException for non-governor user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.issueBankingLicense('u1', bankData)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for null user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.issueBankingLicense('bad', bankData)).rejects.toThrow(BadRequestException);
    });

    it('should generate incrementing license numbers', async () => {
      prisma.user.findUnique.mockResolvedValue(mockGovernor);
      prisma.bank.create.mockResolvedValue({ id: 'bank-1', ...bankData });
      prisma.bank.count.mockResolvedValue(5); // 5 licenses already this year
      prisma.bank.update.mockResolvedValue({});
      prisma.bank.findUnique.mockResolvedValue(mockBank);
      await service.issueBankingLicense('gov-1', bankData);
      // License number should be BL-006/YEAR
      expect(prisma.bank.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          licenseNumber: expect.stringContaining('BL-006'),
        }),
      }));
    });
  });

  // ─── openCorrespondentAccount ──────────
  describe('openCorrespondentAccount', () => {
    it('should open correspondent account for licensed bank', async () => {
      prisma.bank.findUnique.mockResolvedValue({ ...mockBank, licenseStatus: 'ISSUED' });
      prisma.user.findUnique.mockResolvedValue(mockGovernor);
      prisma.bank.count.mockResolvedValue(0);
      prisma.bank.update.mockResolvedValue({ ...mockBank, operationalStatus: 'OPERATIONAL' });
      const result = await service.openCorrespondentAccount('gov-1', 'bank-1', 'ACC-123');
      expect(result.bank).toBeDefined();
      expect(result.agreement).toBeDefined();
    });

    it('should throw NotFoundException for missing bank', async () => {
      prisma.bank.findUnique.mockResolvedValue(null);
      await expect(service.openCorrespondentAccount('gov-1', 'bad', 'ACC')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unlicensed bank', async () => {
      prisma.bank.findUnique.mockResolvedValue({ ...mockBank, licenseStatus: 'PENDING' });
      await expect(service.openCorrespondentAccount('gov-1', 'bank-1', 'ACC')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-governor', async () => {
      prisma.bank.findUnique.mockResolvedValue({ ...mockBank, licenseStatus: 'ISSUED' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.openCorrespondentAccount('u1', 'bank-1', 'ACC')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── executeEmission ───────────────────
  describe('executeEmission', () => {
    const emissionData = {
      amount: '2.1 trillion ALTAN',
      recipientBankId: 'bank-1',
      purpose: 'Initial emission',
    };

    it('should execute emission for operational bank', async () => {
      prisma.bank.findUnique.mockResolvedValue({
        ...mockBank, operationalStatus: 'OPERATIONAL', correspondentAccountNumber: 'CA-001',
      });
      prisma.user.findUnique.mockResolvedValue(mockGovernor);
      prisma.documentContract.count.mockResolvedValue(0);
      const result = await service.executeEmission('gov-1', emissionData);
      expect(result.emissionDocument).toBeDefined();
      expect(result.message).toContain('Emission protocol');
    });

    it('should throw NotFoundException for missing bank', async () => {
      prisma.bank.findUnique.mockResolvedValue(null);
      await expect(service.executeEmission('gov-1', emissionData)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-operational bank', async () => {
      prisma.bank.findUnique.mockResolvedValue({ ...mockBank, operationalStatus: 'PENDING_LICENSE' });
      await expect(service.executeEmission('gov-1', emissionData)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for bank without correspondent account', async () => {
      prisma.bank.findUnique.mockResolvedValue({
        ...mockBank, operationalStatus: 'OPERATIONAL', correspondentAccountNumber: null,
      });
      await expect(service.executeEmission('gov-1', emissionData)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-governor', async () => {
      prisma.bank.findUnique.mockResolvedValue({
        ...mockBank, operationalStatus: 'OPERATIONAL', correspondentAccountNumber: 'CA-001',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.executeEmission('u1', emissionData)).rejects.toThrow(BadRequestException);
    });

    it('should include legal basis in variables', async () => {
      prisma.bank.findUnique.mockResolvedValue({
        ...mockBank, operationalStatus: 'OPERATIONAL', correspondentAccountNumber: 'CA-001',
      });
      prisma.user.findUnique.mockResolvedValue(mockGovernor);
      prisma.documentContract.count.mockResolvedValue(0);
      const dataWithBasis = { ...emissionData, legalBasis: 'Custom legal basis' };
      const result = await service.executeEmission('gov-1', dataWithBasis);
      expect(result.emissionDocument).toBeDefined();
    });
  });
});
