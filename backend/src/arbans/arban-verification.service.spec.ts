import { Test, TestingModule } from '@nestjs/testing';
import { ArbadVerificationService } from './arbad-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TieredVerificationService } from '../verification/tiered-verification.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ArbadVerificationService', () => {
  let service: ArbadVerificationService;
  let prisma: any;

  const mockPrisma = () => ({
    user: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    arbadMutualVerification: {
      findUnique: jest.fn(), findMany: jest.fn(),
      create: jest.fn(), count: jest.fn(), delete: jest.fn(),
    },
    guild: { update: jest.fn().mockResolvedValue({}) },
  });

  const mockTiered = () => ({});

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArbadVerificationService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: TieredVerificationService, useFactory: mockTiered },
      ],
    }).compile();
    service = module.get(ArbadVerificationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('verifyMember', () => {
    it('should create verification', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbadId: 'a1' })
        .mockResolvedValueOnce({ currentArbadId: 'a1' });
      prisma.arbadMutualVerification.findUnique.mockResolvedValue(null);
      prisma.arbadMutualVerification.create.mockResolvedValue({
        verifier: { id: 'u1' }, verified: { id: 'u2' },
      });
      prisma.user.findMany.mockResolvedValue([]);
      prisma.arbadMutualVerification.count.mockResolvedValue(1);

      const result = await service.verifyMember('a1', 'u1', 'u2');
      expect(result.isArbadComplete).toBe(false);
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyMember('a1', 'u1', 'u2'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw if not in same arbad', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbadId: 'a1' })
        .mockResolvedValueOnce({ currentArbadId: 'a2' });
      await expect(service.verifyMember('a1', 'u1', 'u2'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw if self-verification', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbadId: 'a1' })
        .mockResolvedValueOnce({ currentArbadId: 'a1' });
      await expect(service.verifyMember('a1', 'u1', 'u1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if already verified', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ currentArbadId: 'a1' })
        .mockResolvedValueOnce({ currentArbadId: 'a1' });
      prisma.arbadMutualVerification.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.verifyMember('a1', 'u1', 'u2'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('isFullyVerified', () => {
    it('should return true when 20 verifications for 5 members', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' },
      ]);
      prisma.arbadMutualVerification.count.mockResolvedValue(20);
      expect(await service.isFullyVerified('a1')).toBe(true);
    });

    it('should return false if not 5 members', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: '1' }]);
      expect(await service.isFullyVerified('a1')).toBe(false);
    });
  });

  describe('getVerificationProgress', () => {
    it('should calculate progress', async () => {
      prisma.user.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }))
      );
      prisma.arbadMutualVerification.count.mockResolvedValue(10);
      const result = await service.getVerificationProgress('a1');
      expect(result.total).toBe(20);
      expect(result.completed).toBe(10);
      expect(result.percentage).toBe(50);
    });
  });

  describe('getVerificationMatrix', () => {
    it('should build matrix', async () => {
      prisma.arbadMutualVerification.findMany.mockResolvedValue([
        { verifierId: 'u1', verifiedId: 'u2' },
        { verifierId: 'u3', verifiedId: 'u2' },
      ]);
      const matrix = await service.getVerificationMatrix('a1');
      expect(matrix['u2']).toHaveLength(2);
    });
  });

  describe('revokeVerification', () => {
    it('should allow self-revoke', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
      prisma.arbadMutualVerification.delete.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([]);
      prisma.arbadMutualVerification.count.mockResolvedValue(0);
      prisma.user.updateMany.mockResolvedValue({});
      const result = await service.revokeVerification('a1', 'u1', 'u2', 'u1');
      expect(result.success).toBe(true);
    });

    it('should reject unauthorized revoke', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN', id: 'other' });
      await expect(service.revokeVerification('a1', 'u1', 'u2', 'other'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow admin revoke', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', id: 'admin-1' });
      prisma.arbadMutualVerification.delete.mockResolvedValue({});
      prisma.user.findMany.mockResolvedValue([]);
      prisma.arbadMutualVerification.count.mockResolvedValue(0);
      prisma.user.updateMany.mockResolvedValue({});
      const result = await service.revokeVerification('a1', 'u1', 'u2', 'admin-1');
      expect(result.success).toBe(true);
    });
  });

  describe('getUnverifiedMembers', () => {
    it('should return members not yet verified by user', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1' }, { id: 'u2' }, { id: 'u3' },
      ]);
      prisma.arbadMutualVerification.findMany.mockResolvedValue([
        { verifiedId: 'u2' },
      ]);
      const result = await service.getUnverifiedMembers('a1', 'u1');
      // u1 is the verifier (self excluded), u2 already verified → only u3 left
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'u3' })]));
    });
  });

  describe('getMemberVerifications', () => {
    it('should return verifications for a member', async () => {
      prisma.arbadMutualVerification.findMany.mockResolvedValue([
        { verifierId: 'u1', verifiedId: 'u2', verifier: { id: 'u1' } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1' }, { id: 'u2' }, { id: 'u3' },
      ]);
      const result = await service.getMemberVerifications('a1', 'u2');
      expect(result.given).toHaveLength(1);
    });
  });

  describe('getVerificationProgress edge cases', () => {
    it('should return not-complete for non-5-member arbad', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.arbadMutualVerification.count.mockResolvedValue(0);
      const result = await service.getVerificationProgress('a1');
      expect(result.total).toBe(20);
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('onFullVerification', () => {
    it('should upgrade members when arbad is fully verified', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1' }, { id: 'u2' }, { id: 'u3' }, { id: 'u4' }, { id: 'u5' },
      ]);
      prisma.user.updateMany.mockResolvedValue({ count: 5 });
      prisma.guild.update.mockResolvedValue({});
      await (service as any).onFullVerification('a1');
      expect(prisma.user.updateMany).toHaveBeenCalled();
    });
  });
});
