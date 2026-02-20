import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { DistributionService } from '../distribution/distribution.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: any;
  let timeline: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1', role: 'CITIZEN', isVerified: false, isLegalSubject: true,
          verificationCount: 0, maxVerifications: 10,
          verificationsGiven: [], verificationsReceived: [],
        }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      userVerification: {
        create: jest.fn().mockResolvedValue({
          id: 'v1', verifierId: 'admin1', verifiedUserId: 'u1',
          createdAt: new Date(), verificationMethod: 'ADMIN',
          verifier: { id: 'admin1', username: 'Admin', role: 'ADMIN' },
          verifiedUser: { id: 'u1', username: 'User' },
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const mockTimeline = {
      createEvent: jest.fn().mockResolvedValue({ id: 'te1' }),
    };
    // Mock DistributionService — birthright distribution added to verifyUser()
    const mockDistribution = {
      registerCitizenForDistribution: jest.fn().mockResolvedValue({}),
      distributeByLevel: jest.fn().mockResolvedValue({ distributed: true, amount: 900 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TimelineService, useValue: mockTimeline },
        { provide: DistributionService, useValue: mockDistribution },
      ],
    }).compile();
    service = module.get(VerificationService);
    prisma = module.get(PrismaService);
    timeline = module.get(TimelineService);
  });


  it('should be defined', () => expect(service).toBeDefined());

  describe('getPendingUsers', () => {
    it('returns pending users', async () => {
      const r = await service.getPendingUsers();
      expect(r).toEqual([]);
    });
  });

  describe('verifyUser', () => {
    it('verifies user as admin', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'admin1', role: 'ADMIN', isVerified: true,
          verificationCount: 0, maxVerifications: 10, verificationsGiven: [],
        })
        .mockResolvedValueOnce({
          id: 'u1', role: 'CITIZEN', isVerified: false, isLegalSubject: true,
        })
        .mockResolvedValueOnce({
          id: 'u1', verificationsReceived: [], role: 'CITIZEN',
        });
      const r = await service.verifyUser('admin1', 'u1');
      expect(r.verification.id).toBe('v1');
    });
    it('throws when verifier not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyUser('bad', 'u1')).rejects.toThrow('not found');
    });
    it('throws when target not found', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin1', role: 'ADMIN', isVerified: true, verificationsGiven: [] })
        .mockResolvedValueOnce(null);
      await expect(service.verifyUser('admin1', 'bad')).rejects.toThrow('not found');
    });
    it('throws when already verified', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin1', role: 'ADMIN', isVerified: true, verificationsGiven: [] })
        .mockResolvedValueOnce({ id: 'u1', isVerified: true, isLegalSubject: true });
      await expect(service.verifyUser('admin1', 'u1')).rejects.toThrow('already verified');
    });
    it('throws when self-verifying', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', role: 'ADMIN', isVerified: true,
        verificationCount: 0, maxVerifications: 10, verificationsGiven: [],
        isLegalSubject: true,
      });
      await expect(service.verifyUser('u1', 'u1')).rejects.toThrow('yourself');
    });
    it('throws when not verified to verify others', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u2', role: 'CITIZEN', isVerified: false, verificationsGiven: [],
      });
      await expect(service.verifyUser('u2', 'u1')).rejects.toThrow('must be verified');
    });
  });

  describe('getVerificationChain', () => {
    it('returns empty chain for unverified user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', isVerified: false, verificationsReceived: [],
      });
      const r = await service.getVerificationChain('u1');
      expect(r).toEqual([]);
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getVerificationChain('bad')).rejects.toThrow('not found');
    });
  });

  describe('getChainLevel', () => {
    it('returns 0 for no chain', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', verificationsReceived: [],
      });
      const r = await service.getChainLevel('u1');
      expect(r).toBe(0);
    });
  });

  describe('getVerifierStats', () => {
    it('returns stats', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', role: 'CITIZEN', verificationCount: 3, maxVerifications: 10,
        verificationsGiven: [],
      });
      const r = await service.getVerifierStats('u1');
      expect(r.verificationCount).toBe(3);
      expect(r.remainingQuota).toBe(7);
      expect(r.isUnlimited).toBe(false);
    });
    it('returns unlimited for admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin1', role: 'ADMIN', verificationCount: 50, maxVerifications: 10,
        verificationsGiven: [],
      });
      const r = await service.getVerifierStats('admin1');
      expect(r.isUnlimited).toBe(true);
      expect(r.remainingQuota).toBe(-1);
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getVerifierStats('bad')).rejects.toThrow('not found');
    });
  });

  describe('revokeVerification', () => {
    it('revokes as admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
      prisma.userVerification.findUnique.mockResolvedValue({
        id: 'v1', verifiedUserId: 'u1', verifierId: 'admin1',
      });
      const r = await service.revokeVerification('v1', 'admin1', 'fraud');
      expect(r.success).toBe(true);
      expect(prisma.userVerification.delete).toHaveBeenCalled();
    });
    it('throws when not admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.revokeVerification('v1', 'u1', 'test')).rejects.toThrow('admin');
    });
    it('throws when verification not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
      prisma.userVerification.findUnique.mockResolvedValue(null);
      await expect(service.revokeVerification('bad', 'admin1', 'test')).rejects.toThrow('not found');
    });
  });

  // ─── verifyUser edge cases ─────────────
  describe('verifyUser edge cases', () => {
    it('throws when verification quota exhausted', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'u2', role: 'CITIZEN', isVerified: true,
          verificationCount: 10, maxVerifications: 10, verificationsGiven: [],
        })
        .mockResolvedValueOnce({
          id: 'u3', role: 'CITIZEN', isVerified: false, isLegalSubject: true,
        });
      await expect(service.verifyUser('u2', 'u3')).rejects.toThrow('quota');
    });

    it('throws when target has not accepted constitution', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'admin1', role: 'ADMIN', isVerified: true, verificationsGiven: [],
        })
        .mockResolvedValueOnce({
          id: 'u1', role: 'CITIZEN', isVerified: false, isLegalSubject: false,
        });
      await expect(service.verifyUser('admin1', 'u1')).rejects.toThrow('Constitution');
    });

    it('throws when already verified by the same user', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin1', role: 'ADMIN', isVerified: true, verificationsGiven: [] })
        .mockResolvedValueOnce({ id: 'u1', isVerified: false, isLegalSubject: true });
      prisma.userVerification.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.verifyUser('admin1', 'u1')).rejects.toThrow('already verified this user');
    });

    it('verifies user as non-admin user referral', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'u2', role: 'CITIZEN', isVerified: true,
          verificationCount: 3, maxVerifications: 10, verificationsGiven: [],
        })
        .mockResolvedValueOnce({ id: 'u3', isVerified: false, isLegalSubject: true })
        .mockResolvedValueOnce({ id: 'u3', verificationsReceived: [], role: 'CITIZEN' });
      prisma.userVerification.create.mockResolvedValue({
        id: 'v2', verificationMethod: 'USER_REFERRAL',
        verifier: { id: 'u2', username: 'User2', role: 'CITIZEN' },
        verifiedUser: { id: 'u3', username: 'User3' },
      });
      const r = await service.verifyUser('u2', 'u3');
      expect(r.verification.verificationMethod).toBe('USER_REFERRAL');
      expect(r.remainingQuota).toBe(6); // 10 - 3 - 1
    });
  });

  // ─── getVerificationChain with chain ───
  describe('getVerificationChain with actual chain', () => {
    it('traverses chain up to CREATOR', async () => {
      const verificationDate = new Date();
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'u1', verificationsReceived: [{
            verifierId: 'u2', createdAt: verificationDate,
            verifier: { id: 'u2', username: 'Verifier', role: 'CITIZEN' },
          }],
        })
        .mockResolvedValueOnce({
          id: 'u2', role: 'CITIZEN', verificationsReceived: [{
            verifierId: 'creator1', createdAt: verificationDate,
            verifier: { id: 'creator1', username: 'Creator', role: 'CREATOR' },
          }],
        })
        .mockResolvedValueOnce({
          id: 'creator1', role: 'CREATOR', verificationsReceived: [],
        });
      const chain = await service.getVerificationChain('u1');
      expect(chain).toHaveLength(2);
      expect(chain[0].username).toBe('Verifier');
      expect(chain[1].username).toBe('Creator');
    });
  });
});

