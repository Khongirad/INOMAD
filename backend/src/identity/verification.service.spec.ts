import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CitizenAllocationService } from './citizen-allocation.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: any;
  let allocation: any;

  const mockVerifier = {
    id: 'v1', seatId: 'V-SEAT', verificationStatus: 'VERIFIED',
    khuralSeats: [{ group: { id: 'arban-1', parentGroupId: 'zuun-1' } }],
  };
  const mockTarget = {
    id: 'u1', seatId: 'T-SEAT', verificationStatus: 'PENDING',
    khuralSeats: [{ group: { id: 'arban-1', parentGroupId: 'zuun-1' } }],
  };

  const mockPrisma = () => ({
    user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    verification: { create: jest.fn(), count: jest.fn() },
  });

  const mockBlockchain = () => ({
    isAvailable: jest.fn().mockReturnValue(false),
    isActivated: jest.fn(),
  });

  const mockAllocation = () => ({
    createCitizenBankAccount: jest.fn().mockResolvedValue({ alreadyExists: false, bankRef: 'BANK-1', accountCreated: true }),
    allocateLevel1Funds: jest.fn().mockResolvedValue({ allocated: true, amount: 100 }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: BlockchainService, useFactory: mockBlockchain },
        { provide: CitizenAllocationService, useFactory: mockAllocation },
      ],
    }).compile();
    service = module.get(VerificationService);
    prisma = module.get(PrismaService);
    allocation = module.get(CitizenAllocationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── submitVerification ────────────────
  describe('submitVerification', () => {
    it('should submit verification and verify user (referral = 1)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockVerifier);
      prisma.user.findFirst.mockResolvedValue(mockTarget);
      prisma.verification.create.mockResolvedValue({});
      prisma.verification.count.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue({});
      const result = await service.submitVerification('V-SEAT', 'u1');
      expect(result.count).toBe(1);
      expect(result.verified).toBe(true);
    });

    it('should also verify with multiple referrals', async () => {
      prisma.user.findUnique.mockResolvedValue(mockVerifier);
      prisma.user.findFirst.mockResolvedValue(mockTarget);
      prisma.verification.create.mockResolvedValue({});
      prisma.verification.count.mockResolvedValue(3);
      prisma.user.update.mockResolvedValue({});
      const result = await service.submitVerification('V-SEAT', 'u1');
      expect(result.verified).toBe(true);
    });

    it('should throw if verifier not verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockVerifier, verificationStatus: 'PENDING' });
      prisma.user.findFirst.mockResolvedValue(mockTarget);
      await expect(service.submitVerification('V-SEAT', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if target not found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockVerifier);
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.submitVerification('V-SEAT', 'bad')).rejects.toThrow(BadRequestException);
    });

    it('should throw if different Arban', async () => {
      const otherTarget = {
        ...mockTarget,
        khuralSeats: [{ group: { id: 'arban-2', parentGroupId: 'zuun-1' } }],
      };
      prisma.user.findUnique.mockResolvedValue(mockVerifier);
      prisma.user.findFirst.mockResolvedValue(otherTarget);
      await expect(service.submitVerification('V-SEAT', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── superVerify ───────────────────────
  describe('superVerify', () => {
    it('should super verify with valid mandate', async () => {
      prisma.user.findFirst.mockResolvedValue(mockTarget);
      prisma.user.update.mockResolvedValue({ ...mockTarget, verificationStatus: 'VERIFIED', seatId: 'T-SEAT' });
      const result = await service.superVerify('FOUNDER-001', 'u1', 'Founder decision');
      expect(result.status).toBe('SUPER_VERIFIED');
      expect(result.banking.accountCreated).toBe(true);
    });

    it('should throw for invalid mandate', async () => {
      await expect(service.superVerify('INVALID', 'u1', 'test')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if target not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.superVerify('FOUNDER-001', 'bad', 'test')).rejects.toThrow(BadRequestException);
    });

    it('should handle banking failure gracefully', async () => {
      prisma.user.findFirst.mockResolvedValue(mockTarget);
      prisma.user.update.mockResolvedValue({ ...mockTarget, seatId: 'T-SEAT' });
      allocation.createCitizenBankAccount.mockRejectedValue(new Error('Bank offline'));
      const result = await service.superVerify('FOUNDER-001', 'u1', 'test');
      expect(result.status).toBe('SUPER_VERIFIED');
      expect(result.banking.error).toBeDefined();
    });
  });

  // ─── getVerificationStatus ─────────────
  describe('getVerificationStatus', () => {
    it('should return status with progress', async () => {
      prisma.user.findFirst.mockResolvedValue(mockTarget);
      prisma.verification.count.mockResolvedValue(2);
      const result = await service.getVerificationStatus('u1');
      expect(result!.progress).toBe(2);
      expect(result!.required).toBe(1);
    });

    it('should return null if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const result = await service.getVerificationStatus('bad');
      expect(result).toBeNull();
    });
  });
});
