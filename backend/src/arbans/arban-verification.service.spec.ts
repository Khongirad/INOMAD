import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArbanVerificationService } from './arban-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TieredVerificationService } from '../verification/tiered-verification.service';

describe('ArbanVerificationService', () => {
  let service: ArbanVerificationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      arbanMutualVerification: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      guild: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArbanVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: TieredVerificationService, useValue: {} },
      ],
    }).compile();

    service = module.get<ArbanVerificationService>(ArbanVerificationService);
  });

  describe('verifyMember', () => {
    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyMember('arban-1', 'verifier-1', 'verified-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if users not in same arban', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbanId: 'arban-1' })
        .mockResolvedValueOnce({ currentArbanId: 'arban-2' }); // different

      await expect(
        service.verifyMember('arban-1', 'v1', 'v2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject self-verification', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbanId: 'arban-1' })
        .mockResolvedValueOnce({ currentArbanId: 'arban-1' });

      await expect(
        service.verifyMember('arban-1', 'same', 'same'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate verification', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbanId: 'arban-1' })
        .mockResolvedValueOnce({ currentArbanId: 'arban-1' });
      prisma.arbanMutualVerification.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.verifyMember('arban-1', 'v1', 'v2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isFullyVerified', () => {
    it('should return false if not 5 members', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]); // only 2

      const result = await service.isFullyVerified('arban-1');
      expect(result).toBe(false);
    });

    it('should return true when 20 verifications exist', async () => {
      prisma.user.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ id: `user-${i}` })),
      );
      prisma.arbanMutualVerification.count.mockResolvedValue(20);

      const result = await service.isFullyVerified('arban-1');
      expect(result).toBe(true);
    });

    it('should return false when verifications incomplete', async () => {
      prisma.user.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ id: `user-${i}` })),
      );
      prisma.arbanMutualVerification.count.mockResolvedValue(15);

      const result = await service.isFullyVerified('arban-1');
      expect(result).toBe(false);
    });
  });

  describe('getVerificationProgress', () => {
    it('should return zero progress for incomplete arban', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: '1' }]); // only 1 member

      const result = await service.getVerificationProgress('arban-1');
      expect(result.total).toBe(20);
      expect(result.completed).toBe(0);
      expect(result.isComplete).toBe(false);
    });

    it('should compute correct progress', async () => {
      prisma.user.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ id: `user-${i}` })),
      );
      prisma.arbanMutualVerification.count.mockResolvedValue(10);

      const result = await service.getVerificationProgress('arban-1');
      expect(result.total).toBe(20);
      expect(result.completed).toBe(10);
      expect(result.percentage).toBe(50);
      expect(result.remaining).toBe(10);
    });
  });

  describe('getVerificationMatrix', () => {
    it('should build verification matrix', async () => {
      prisma.arbanMutualVerification.findMany.mockResolvedValue([
        { verifierId: 'A', verifiedId: 'B' },
        { verifierId: 'C', verifiedId: 'B' },
        { verifierId: 'A', verifiedId: 'C' },
      ]);

      const matrix = await service.getVerificationMatrix('arban-1');
      expect(matrix['B']).toEqual(['A', 'C']);
      expect(matrix['C']).toEqual(['A']);
    });
  });

  describe('revokeVerification', () => {
    it('should reject unauthorized revocation', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN', id: 'other' });

      await expect(
        service.revokeVerification('arban-1', 'v1', 'v2', 'other'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow self-revocation', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN', id: 'v1' });
      prisma.user.findMany.mockResolvedValue([{ id: '1' }]); // not 5 members
      prisma.arbanMutualVerification.count.mockResolvedValue(0);

      const result = await service.revokeVerification('arban-1', 'v1', 'v2', 'v1');
      expect(result.success).toBe(true);
    });
  });
});
