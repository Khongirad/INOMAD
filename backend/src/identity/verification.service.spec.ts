import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CitizenAllocationService } from './citizen-allocation.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: any;
  let blockchain: any;
  let allocation: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      verification: {
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    blockchain = { isAvailable: jest.fn().mockReturnValue(false), isActivated: jest.fn() };
    allocation = {
      createCitizenBankAccount: jest.fn().mockResolvedValue({ bankRef: 'B1', accountCreated: true, alreadyExists: false }),
      allocateLevel1Funds: jest.fn().mockResolvedValue({ allocated: true, amount: 100, bankRef: 'B1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
        { provide: CitizenAllocationService, useValue: allocation },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  describe('submitVerification', () => {
    it('should reject unverified verifier', async () => {
      prisma.user.findUnique.mockResolvedValue({ verificationStatus: 'PENDING' });
      prisma.user.findFirst.mockResolvedValue({ id: 'target' });
      await expect(service.submitVerification('S1', 'target')).rejects.toThrow(ForbiddenException);
    });

    it('should reject unknown target', async () => {
      prisma.user.findUnique.mockResolvedValue({
        verificationStatus: 'VERIFIED',
        khuralSeats: [{ group: { parentGroupId: 'z1' } }],
      });
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.submitVerification('S1', 'bad')).rejects.toThrow(BadRequestException);
    });

    it('should reject cross-Zuun verification', async () => {
      prisma.user.findUnique.mockResolvedValue({
        verificationStatus: 'VERIFIED',
        khuralSeats: [{ group: { parentGroupId: 'z1' } }],
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'target',
        khuralSeats: [{ group: { parentGroupId: 'z2' } }],
      });
      await expect(service.submitVerification('S1', 'target')).rejects.toThrow(ForbiddenException);
    });

    it('should verify and return count', async () => {
      prisma.user.findUnique.mockResolvedValue({
        verificationStatus: 'VERIFIED',
        khuralSeats: [{ group: { parentGroupId: 'z1' } }],
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'target',
        khuralSeats: [{ group: { parentGroupId: 'z1' } }],
      });
      prisma.verification.count.mockResolvedValue(2);

      const result = await service.submitVerification('S1', 'target');
      expect(result.count).toBe(2);
      expect(result.verified).toBe(false);
    });

    it('should auto-verify at quorum of 3', async () => {
      prisma.user.findUnique.mockResolvedValue({
        verificationStatus: 'VERIFIED',
        khuralSeats: [{ group: { parentGroupId: 'z1' } }],
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'target', seatId: 'S2',
        khuralSeats: [{ group: { parentGroupId: 'z1' } }],
      });
      prisma.verification.count.mockResolvedValue(3);

      const result = await service.submitVerification('S1', 'target');
      expect(result.verified).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ verificationStatus: 'VERIFIED' }) }),
      );
    });
  });

  describe('superVerify', () => {
    it('should reject non-founder mandate', async () => {
      await expect(service.superVerify('INVALID-SEAT', 'target', 'reason')).rejects.toThrow(ForbiddenException);
    });

    it('should reject unknown target', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.superVerify('FOUNDER-001', 'bad', 'reason')).rejects.toThrow(BadRequestException);
    });

    it('should super-verify and allocate funds', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'target', seatId: 'S2' });
      prisma.user.update.mockResolvedValue({ id: 'target', seatId: 'S2' });

      const result = await service.superVerify('FOUNDER-001', 'target', 'Bootstrap');
      expect(result.status).toBe('SUPER_VERIFIED');
      expect(result.banking.fundsAllocated).toBe(true);
      expect(allocation.createCitizenBankAccount).toHaveBeenCalled();
    });
  });

  describe('getVerificationStatus', () => {
    it('should return null for unknown user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const result = await service.getVerificationStatus('bad');
      expect(result).toBeNull();
    });

    it('should return status with progress', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1', seatId: 'S1', isSuperVerified: false,
        khuralSeats: [],
      });
      prisma.verification.count.mockResolvedValue(2);
      const result = await service.getVerificationStatus('u1');
      expect(result.progress).toBe(2);
      expect(result.required).toBe(3);
    });
  });
});
