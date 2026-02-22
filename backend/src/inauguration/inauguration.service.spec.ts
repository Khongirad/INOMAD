import { Test, TestingModule } from '@nestjs/testing';
import { InaugurationService } from './inauguration.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CareerRole, CareerStatus, CareerType } from '@prisma/client';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────
const NINE_STAFF = Array.from({ length: 9 }, (_, i) => `staff-${i + 1}`);
const LAW_IDS = ['law-1', 'law-2', 'law-3'];

const makeTx = (p: any) => ({ ...p });

const makePrisma = () => {
  const p: any = {
    careerLog: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    lawArticle: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    quest: {
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn().mockImplementation((cb: any, _opts?: any) =>
      typeof cb === 'function' ? cb(makeTx(p)) : Promise.all(cb),
    ),
  };
  return p;
};

describe('InaugurationService', () => {
  let service: InaugurationService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InaugurationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(InaugurationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ────────────────────────────────────────────────────────────────
  // generateOathHash
  // ────────────────────────────────────────────────────────────────
  describe('generateOathHash', () => {
    it('returns a 64-char hex string', () => {
      const ts = new Date('2026-01-01T00:00:00Z');
      const hash = service.generateOathHash('leader-1', NINE_STAFF, LAW_IDS, ts);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('is deterministic — same inputs produce same hash', () => {
      const ts = new Date('2026-01-01T00:00:00Z');
      const h1 = service.generateOathHash('leader-1', NINE_STAFF, LAW_IDS, ts);
      const h2 = service.generateOathHash('leader-1', NINE_STAFF, LAW_IDS, ts);
      expect(h1).toBe(h2);
    });

    it('is order-independent for staff IDs (sorted)', () => {
      const ts = new Date('2026-01-01T00:00:00Z');
      const shuffled = [...NINE_STAFF].reverse();
      const h1 = service.generateOathHash('leader-1', NINE_STAFF, LAW_IDS, ts);
      const h2 = service.generateOathHash('leader-1', shuffled, LAW_IDS, ts);
      expect(h1).toBe(h2);
    });

    it('produces different hash for different leader', () => {
      const ts = new Date('2026-01-01T00:00:00Z');
      const h1 = service.generateOathHash('leader-A', NINE_STAFF, LAW_IDS, ts);
      const h2 = service.generateOathHash('leader-B', NINE_STAFF, LAW_IDS, ts);
      expect(h1).not.toBe(h2);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // inaugurate — validation
  // ────────────────────────────────────────────────────────────────
  describe('inaugurate — validation', () => {
    it('throws BadRequestException if staffUserIds.length !== 9', async () => {
      await expect(
        service.inaugurate({
          leaderUserId: 'leader-1',
          role: CareerRole.ZUN,
          staffUserIds: ['staff-1', 'staff-2'], // only 2
          lawArticleIds: LAW_IDS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if leader is in staff list (no self-guard)', async () => {
      const staffWithLeader = [...NINE_STAFF.slice(0, 8), 'leader-1'];
      await expect(
        service.inaugurate({
          leaderUserId: 'leader-1',
          role: CareerRole.ZUN,
          staffUserIds: staffWithLeader,
          lawArticleIds: LAW_IDS,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if duplicate staff IDs', async () => {
      const duplicated = [...Array(9).fill('staff-1')];
      await expect(
        service.inaugurate({
          leaderUserId: 'leader-1',
          role: CareerRole.ZUN,
          staffUserIds: duplicated,
          lawArticleIds: LAW_IDS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if lawArticleIds not found', async () => {
      prisma.lawArticle.findMany.mockResolvedValue([]); // nothing found
      await expect(
        service.inaugurate({
          leaderUserId: 'leader-1',
          role: CareerRole.ZUN,
          staffUserIds: NINE_STAFF,
          lawArticleIds: LAW_IDS,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // inaugurate — happy path
  // ────────────────────────────────────────────────────────────────
  describe('inaugurate — happy path', () => {
    beforeEach(() => {
      prisma.lawArticle.findMany.mockResolvedValue(
        LAW_IDS.map((id) => ({ id, code: `CODE-${id}`, isActive: true })),
      );
      prisma.careerLog.updateMany.mockResolvedValue({ count: 0 });
      let callCount = 0;
      prisma.careerLog.create.mockImplementation(() => {
        callCount++;
        return Promise.resolve({ id: `log-${callCount}` });
      });
    });

    it('creates 1 leader log + 9 staff logs = 10 total', async () => {
      const result = await service.inaugurate({
        leaderUserId: 'leader-1',
        role: CareerRole.ZUN,
        staffUserIds: NINE_STAFF,
        lawArticleIds: LAW_IDS,
      });

      expect(prisma.careerLog.create).toHaveBeenCalledTimes(10);
      expect(result.staffCareerLogIds).toHaveLength(9);
      expect(result.contractHash).toHaveLength(64);
    });

    it('closes previous ACTIVE terms before creating new ones', async () => {
      await service.inaugurate({
        leaderUserId: 'leader-1',
        role: CareerRole.ZUN,
        staffUserIds: NINE_STAFF,
        lawArticleIds: LAW_IDS,
      });

      expect(prisma.careerLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: CareerStatus.ACTIVE }),
          data: expect.objectContaining({ status: CareerStatus.COMPLETED, exitReason: 'Promotion' }),
        }),
      );
    });

    it('uses Serializable $transaction', async () => {
      await service.inaugurate({
        leaderUserId: 'leader-1',
        role: CareerRole.ZUN,
        staffUserIds: NINE_STAFF,
        lawArticleIds: LAW_IDS,
      });

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // revokeLeader
  // ────────────────────────────────────────────────────────────────
  describe('revokeLeader', () => {
    const leaderLog = {
      id: 'log-leader',
      type: CareerType.LEADER,
      status: CareerStatus.ACTIVE,
      staff: [{ id: 'staff-log-1' }, { id: 'staff-log-2' }],
    };

    beforeEach(() => {
      prisma.careerLog.findUnique.mockResolvedValue(leaderLog);
      prisma.careerLog.updateMany.mockResolvedValue({ count: 2 });
      prisma.careerLog.update.mockResolvedValue({ ...leaderLog, status: CareerStatus.REVOKED });
    });

    it('revokes leader and all staff', async () => {
      const result = await service.revokeLeader('log-leader');
      expect(result.revokedStaffCount).toBe(2);
      expect(prisma.careerLog.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CareerStatus.REVOKED }),
        }),
      );
      expect(prisma.careerLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-leader' },
          data: expect.objectContaining({ status: CareerStatus.REVOKED }),
        }),
      );
    });

    it('throws NotFoundException if careerLog not found', async () => {
      prisma.careerLog.findUnique.mockResolvedValue(null);
      await expect(service.revokeLeader('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if target is STAFF (not LEADER)', async () => {
      prisma.careerLog.findUnique.mockResolvedValue({
        ...leaderLog,
        type: CareerType.STAFF,
      });
      await expect(service.revokeLeader('log-leader')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if leader already REVOKED', async () => {
      prisma.careerLog.findUnique.mockResolvedValue({
        ...leaderLog,
        status: CareerStatus.REVOKED,
      });
      await expect(service.revokeLeader('log-leader')).rejects.toThrow(BadRequestException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // getLegalTrace
  // ────────────────────────────────────────────────────────────────
  describe('getLegalTrace', () => {
    const law = { id: 'law-1', code: 'CONST-1-1', title: 'Sovereignty', source: 'Constitution' };
    const mockLeaderLog = {
      id: 'log-1',
      userId: 'leader-1',
      role: CareerRole.ZUN,
      type: CareerType.LEADER,
      contractHash: 'abc123',
      inaugurationAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000),
      lawRefs: [{ law }],
      staff: [
        {
          id: 'staff-log-1',
          userId: 'staff-1',
          role: CareerRole.ZUN,
          lawRefs: [{ lawArticleId: 'law-1', law }],
        },
      ],
    };

    it('returns leader, staff, sharedLaws, and graphEdges', async () => {
      prisma.careerLog.findFirst.mockResolvedValue(mockLeaderLog);

      const result = await service.getLegalTrace('leader-1');
      expect(result.leader.userId).toBe('leader-1');
      expect(result.staff).toHaveLength(1);
      expect(result.sharedLaws).toHaveLength(1); // law-1 sworn by both
      expect(result.graphEdges.length).toBeGreaterThan(0);
    });

    it('throws NotFoundException if no active leader log', async () => {
      prisma.careerLog.findFirst.mockResolvedValue(null);
      await expect(service.getLegalTrace('nobody')).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // checkAndExpireTerms (cron)
  // ────────────────────────────────────────────────────────────────
  describe('checkAndExpireTerms', () => {
    it('expires leader + cascades to staff', async () => {
      prisma.careerLog.findMany.mockResolvedValueOnce([
        { id: 'log-leader', userId: 'leader-1', role: CareerRole.ZUN },
      ]);
      prisma.careerLog.count.mockResolvedValue(0); // no orphan staff
      prisma.careerLog.updateMany.mockResolvedValue({ count: 1 });

      await service.checkAndExpireTerms();

      expect(prisma.careerLog.updateMany).toHaveBeenCalledTimes(2); // staff + leader
    });

    it('skips if no expired leaders', async () => {
      prisma.careerLog.findMany.mockResolvedValue([]);
      prisma.careerLog.count.mockResolvedValue(0);

      await service.checkAndExpireTerms();

      expect(prisma.careerLog.updateMany).not.toHaveBeenCalled();
    });

    it('expires orphaned staff separately', async () => {
      prisma.careerLog.findMany.mockResolvedValue([]);
      prisma.careerLog.count.mockResolvedValue(3); // 3 orphan staff expired
      prisma.careerLog.updateMany.mockResolvedValue({ count: 3 });

      await service.checkAndExpireTerms();

      expect(prisma.careerLog.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
