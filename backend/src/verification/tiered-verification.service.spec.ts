import { Test, TestingModule } from '@nestjs/testing';
import { TieredVerificationService } from './tiered-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { DistributionService } from '../distribution/distribution.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('TieredVerificationService', () => {
  let service: TieredVerificationService;
  let prisma: any;
  let distribution: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1', verificationLevel: 'UNVERIFIED', role: 'CITIZEN',
          totalEmitted: new Decimal(0), currentArbanId: null,
        }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      verificationRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({
          id: 'vr1', requesterId: 'u1', requestedLevel: 'ZUN_VERIFIED',
          status: 'PENDING', justification: 'test',
          requester: { id: 'u1', verificationLevel: 'ARBAN_VERIFIED' },
        }),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'vr1' }),
        update: jest.fn().mockResolvedValue({ id: 'vr1', status: 'APPROVED' }),
      },
    };
    const mockDistribution = {
      distributeByLevel: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TieredVerificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DistributionService, useValue: mockDistribution },
      ],
    }).compile();
    service = module.get(TieredVerificationService);
    prisma = module.get(PrismaService);
    distribution = module.get(DistributionService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getEmissionLimit', () => {
    it('returns 100 for UNVERIFIED', () => {
      expect(service.getEmissionLimit('UNVERIFIED' as any)).toBe(100);
    });
    it('returns 1000 for ARBAN_VERIFIED', () => {
      expect(service.getEmissionLimit('ARBAN_VERIFIED' as any)).toBe(1000);
    });
    it('returns MAX_SAFE_INTEGER for ZUN_VERIFIED (all remaining emission)', () => {
      expect(service.getEmissionLimit('ZUN_VERIFIED' as any)).toBe(Number.MAX_SAFE_INTEGER);
    });
    it('returns MAX_SAFE_INTEGER for FULLY_VERIFIED', () => {
      expect(service.getEmissionLimit('FULLY_VERIFIED' as any)).toBe(Number.MAX_SAFE_INTEGER);
    });
    it('returns MAX_SAFE_INTEGER for CREATOR role', () => {
      expect(service.getEmissionLimit('UNVERIFIED' as any, 'CREATOR' as any)).toBe(Number.MAX_SAFE_INTEGER);
    });
    it('returns 0 for unknown level', () => {
      expect(service.getEmissionLimit('UNKNOWN' as any)).toBe(0);
    });
  });

  describe('canEmit', () => {
    it('returns true when under limit', async () => {
      const result = await service.canEmit('u1', 50);
      expect(result).toBe(true);
    });
    it('returns false when over limit', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'UNVERIFIED', role: 'CITIZEN',
        totalEmitted: new Decimal(90), currentArbanId: null,
      });
      const result = await service.canEmit('u1', 20);
      expect(result).toBe(false);
    });
    it('returns true for CREATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'UNVERIFIED', role: 'CREATOR',
        totalEmitted: new Decimal(999999), currentArbanId: null,
      });
      const result = await service.canEmit('u1', 100);
      expect(result).toBe(true);
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.canEmit('bad', 100)).rejects.toThrow('not found');
    });
    it('checks arban total for ARBAN_VERIFIED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'ARBAN_VERIFIED', role: 'CITIZEN',
        totalEmitted: new Decimal(100), currentArbanId: 'a1',
      });
      prisma.user.findMany.mockResolvedValue([
        { totalEmitted: new Decimal(200) },
        { totalEmitted: new Decimal(300) },
      ]);
      const result = await service.canEmit('u1', 400);
      expect(result).toBe(true);
    });
  });

  describe('recordEmission', () => {
    it('records emission', async () => {
      await service.recordEmission('u1', 50);
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('throws when exceeds limit', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'UNVERIFIED', role: 'CITIZEN',
        totalEmitted: new Decimal(90), currentArbanId: null,
      });
      await expect(service.recordEmission('u1', 20)).rejects.toThrow('Emission limit exceeded');
    });
  });

  describe('getEmissionStatus', () => {
    it('returns status for regular user', async () => {
      const result = await service.getEmissionStatus('u1');
      expect(result.level).toBe('UNVERIFIED');
      expect(result.limit).toBe(100);
      expect(result.isUnlimited).toBe(false);
    });
    it('returns unlimited for CREATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'UNVERIFIED', role: 'CREATOR',
        totalEmitted: new Decimal(0), currentArbanId: null,
      });
      const result = await service.getEmissionStatus('u1');
      expect(result.isUnlimited).toBe(true);
    });
    it('returns unlimited for FULLY_VERIFIED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'FULLY_VERIFIED', role: 'CITIZEN',
        totalEmitted: new Decimal(0), currentArbanId: null,
      });
      const result = await service.getEmissionStatus('u1');
      expect(result.isUnlimited).toBe(true);
    });
    it('returns unlimited for ZUN_VERIFIED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'ZUN_VERIFIED', role: 'CITIZEN',
        totalEmitted: new Decimal(0), currentArbanId: null,
      });
      const result = await service.getEmissionStatus('u1');
      expect(result.isUnlimited).toBe(true);
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getEmissionStatus('bad')).rejects.toThrow('not found');
    });
  });

  describe('requestVerificationUpgrade', () => {
    it('creates request for ZUN_VERIFIED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'ARBAN_VERIFIED',
      });
      const result = await service.requestVerificationUpgrade('u1', 'ZUN_VERIFIED' as any, 'Need it');
      expect(result.id).toBe('vr1');
    });
    it('throws for invalid level', async () => {
      await expect(service.requestVerificationUpgrade('u1', 'ARBAN_VERIFIED' as any, 'test')).rejects.toThrow('Can only request');
    });
    it('throws when not ARBAN_VERIFIED for ZUN request', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'UNVERIFIED',
      });
      await expect(service.requestVerificationUpgrade('u1', 'ZUN_VERIFIED' as any, 'test')).rejects.toThrow('ARBAN_VERIFIED');
    });
    it('throws when not ZUN_VERIFIED for FULL request', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationLevel: 'ARBAN_VERIFIED',
      });
      await expect(service.requestVerificationUpgrade('u1', 'FULLY_VERIFIED' as any, 'test')).rejects.toThrow('ZUN_VERIFIED');
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestVerificationUpgrade('u1', 'ZUN_VERIFIED' as any, 'test')).rejects.toThrow('not found');
    });
  });

  describe('reviewVerificationRequest', () => {
    it('approves request', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'CREATOR' });
      await service.reviewVerificationRequest('vr1', 'admin1', true, 'Approved');
      expect(prisma.verificationRequest.update).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('rejects request', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
      await service.reviewVerificationRequest('vr1', 'admin1', false, 'Rejected');
      expect(prisma.verificationRequest.update).toHaveBeenCalled();
    });
    it('throws when not admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.reviewVerificationRequest('vr1', 'u1', true)).rejects.toThrow('Only Creator or Admin');
    });
    it('throws when request not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'CREATOR' });
      prisma.verificationRequest.findUnique.mockResolvedValue(null);
      await expect(service.reviewVerificationRequest('bad', 'admin1', true)).rejects.toThrow('not found');
    });
    it('throws when already reviewed', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'CREATOR' });
      prisma.verificationRequest.findUnique.mockResolvedValue({
        id: 'vr1', status: 'APPROVED', requester: {},
      });
      await expect(service.reviewVerificationRequest('vr1', 'admin1', true)).rejects.toThrow('already reviewed');
    });
  });

  describe('getPendingRequests', () => {
    it('returns pending', async () => {
      const result = await service.getPendingRequests();
      expect(result).toEqual([]);
    });
  });

  describe('getMyRequests', () => {
    it('returns requests', async () => {
      const result = await service.getMyRequests('u1');
      expect(result).toEqual([]);
    });
  });

  describe('setVerificationLevel', () => {
    it('sets level as CREATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'CREATOR' });
      await service.setVerificationLevel('u1', 'ZUN_VERIFIED' as any, 'admin1');
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('sets FULLY_VERIFIED', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'CREATOR' });
      await service.setVerificationLevel('u1', 'FULLY_VERIFIED' as any, 'admin1');
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('sets ARBAN_VERIFIED', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'CREATOR' });
      await service.setVerificationLevel('u1', 'ARBAN_VERIFIED' as any, 'admin1');
      expect(prisma.user.update).toHaveBeenCalled();
    });
    it('throws when not CREATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.setVerificationLevel('u1', 'ZUN_VERIFIED' as any, 'u1')).rejects.toThrow('Only Creator');
    });
  });
});
