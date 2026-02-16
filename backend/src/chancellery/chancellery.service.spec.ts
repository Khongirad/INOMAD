import { Test, TestingModule } from '@nestjs/testing';
import { ChancelleryService } from './chancellery.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ChancelleryService', () => {
  let service: ChancelleryService;
  let prisma: any;

  const mockContract = {
    id: 'c1', documentNumber: 'DOC-001', title: 'Contract',
    currentStage: 'ACTIVE', status: 'ACTIVE', createdAt: new Date(),
  };

  const mockPrisma = () => ({
    documentSignature: { findFirst: jest.fn() },
    notarizationRecord: { findFirst: jest.fn(), count: jest.fn().mockResolvedValue(5) },
    legalCertification: { findFirst: jest.fn(), count: jest.fn().mockResolvedValue(2) },
    judicialCase: { findFirst: jest.fn() },
    documentContract: {
      findMany: jest.fn().mockResolvedValue([mockContract]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(10),
    },
    dispute: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(3),
    },
    complaint: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChancelleryService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(ChancelleryService);
    prisma = module.get(PrismaService);
  });

  const grantAccess = () => {
    prisma.documentSignature.findFirst.mockResolvedValue({ id: 'sig-1' });
  };
  const denyAccess = () => {
    prisma.documentSignature.findFirst.mockResolvedValue(null);
    prisma.notarizationRecord.findFirst.mockResolvedValue(null);
    prisma.legalCertification.findFirst.mockResolvedValue(null);
    prisma.judicialCase.findFirst.mockResolvedValue(null);
  };

  it('should be defined', () => expect(service).toBeDefined());

  // ─── verifyLegalAccess ─────────────────
  describe('access control', () => {
    it('should deny access for non-legal user', async () => {
      denyAccess();
      await expect(service.getRegistry('u1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow access via notary role', async () => {
      prisma.documentSignature.findFirst.mockResolvedValue(null);
      prisma.notarizationRecord.findFirst.mockResolvedValue({ id: 'nr-1' });
      const result = await service.getRegistry('u1');
      expect(result.contracts).toHaveLength(1);
    });

    it('should allow access via judge role', async () => {
      prisma.documentSignature.findFirst.mockResolvedValue(null);
      prisma.notarizationRecord.findFirst.mockResolvedValue(null);
      prisma.legalCertification.findFirst.mockResolvedValue(null);
      prisma.judicialCase.findFirst.mockResolvedValue({ id: 'jc-1' });
      const result = await service.getRegistry('u1');
      expect(result.contracts).toHaveLength(1);
    });
  });

  // ─── getRegistry ───────────────────────
  describe('getRegistry', () => {
    it('should return paginated contracts', async () => {
      grantAccess();
      const result = await service.getRegistry('u1', { page: 1, limit: 10 });
      expect(result.contracts).toHaveLength(1);
      expect(result.total).toBe(10);
    });
  });

  // ─── getContractDetails ────────────────
  describe('getContractDetails', () => {
    it('should return contract details', async () => {
      grantAccess();
      prisma.documentContract.findUnique.mockResolvedValue(mockContract);
      const result = await service.getContractDetails('u1', 'c1');
      expect(result.id).toBe('c1');
    });

    it('should throw NotFoundException', async () => {
      grantAccess();
      prisma.documentContract.findUnique.mockResolvedValue(null);
      await expect(service.getContractDetails('u1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getRegistryDisputes ───────────────
  describe('getRegistryDisputes', () => {
    it('should return paginated disputes', async () => {
      grantAccess();
      const result = await service.getRegistryDisputes('u1');
      expect(result).toHaveProperty('disputes');
      expect(result).toHaveProperty('totalPages');
    });
  });

  // ─── getRegistryComplaints ─────────────
  describe('getRegistryComplaints', () => {
    it('should return paginated complaints', async () => {
      grantAccess();
      const result = await service.getRegistryComplaints('u1');
      expect(result).toHaveProperty('complaints');
    });
  });

  // ─── getStats ──────────────────────────
  describe('getStats', () => {
    it('should return chancellery stats', async () => {
      grantAccess();
      const result = await service.getStats('u1');
      expect(result).toHaveProperty('totalContracts');
      expect(result).toHaveProperty('openDisputes');
    });
  });
});
