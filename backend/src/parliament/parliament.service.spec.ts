import { Test, TestingModule } from '@nestjs/testing';
import { ParliamentService } from './parliament.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ParliamentService', () => {
  let service: ParliamentService;
  let prisma: any;

  const mockSession = {
    id: 's-1', level: 'REPUBLICAN', entityId: 'rep-1',
    title: 'Budget Vote', description: 'Annual budget', status: 'SCHEDULED',
    convenedById: 'chair-1', quorumRequired: 3, quorumMet: false,
    resolution: null, sessionDate: new Date(),
    convenedBy: { id: 'chair-1', username: 'Chairman' },
    votes: [],
    _count: { votes: 0 },
  };

  const mockRepublic = {
    id: 'rep-1', chairmanUserId: 'chair-1',
    memberTumens: [{ leaderUserId: 'leader-1' }, { leaderUserId: 'leader-2' }],
  };

  const mockTumen = {
    id: 't-1', leaderUserId: 'leader-1', isActive: true, republicId: 'rep-1',
    name: 'Tumen-1', totalMembers: 100,
  };

  const mockPrisma = () => ({
    republicanKhural: { findUnique: jest.fn() },
    confederativeKhural: { findFirst: jest.fn() },
    khuralSession: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(),
    },
    tumen: { findFirst: jest.fn() },
    familyArban: { findFirst: jest.fn() },
    khuralVote: { findUnique: jest.fn(), create: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParliamentService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(ParliamentService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createSession ─────────────────────
  describe('createSession', () => {
    const sessionData = {
      level: 'REPUBLICAN' as const, entityId: 'rep-1', title: 'Budget',
      sessionDate: '2026-03-01', quorumRequired: 3,
    };

    it('should create REPUBLICAN session as chairman', async () => {
      prisma.republicanKhural.findUnique.mockResolvedValue(mockRepublic);
      prisma.khuralSession.create.mockResolvedValue(mockSession);
      const result = await service.createSession('chair-1', sessionData);
      expect(result.id).toBe('s-1');
    });

    it('should allow Tumen leader to create REPUBLICAN session', async () => {
      prisma.republicanKhural.findUnique.mockResolvedValue(mockRepublic);
      prisma.khuralSession.create.mockResolvedValue(mockSession);
      const result = await service.createSession('leader-1', sessionData);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for missing republic', async () => {
      prisma.republicanKhural.findUnique.mockResolvedValue(null);
      await expect(service.createSession('chair-1', sessionData)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prisma.republicanKhural.findUnique.mockResolvedValue({
        ...mockRepublic, chairmanUserId: 'other',
      });
      await expect(service.createSession('random', sessionData)).rejects.toThrow(ForbiddenException);
    });

    it('should create CONFEDERATIVE session', async () => {
      prisma.confederativeKhural.findFirst.mockResolvedValue({ id: 'conf-1' });
      prisma.khuralSession.create.mockResolvedValue(mockSession);
      const confData = { ...sessionData, level: 'CONFEDERATIVE' as const, entityId: 'conf-1' };
      const result = await service.createSession('chair-1', confData);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException for missing confederation', async () => {
      prisma.confederativeKhural.findFirst.mockResolvedValue(null);
      const confData = { ...sessionData, level: 'CONFEDERATIVE' as const, entityId: 'bad' };
      await expect(service.createSession('chair-1', confData)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listSessions ──────────────────────
  describe('listSessions', () => {
    it('should list sessions with filters', async () => {
      prisma.khuralSession.findMany.mockResolvedValue([mockSession]);
      const result = await service.listSessions('REPUBLICAN', 'rep-1', 'SCHEDULED');
      expect(result).toHaveLength(1);
    });

    it('should list all sessions without filters', async () => {
      prisma.khuralSession.findMany.mockResolvedValue([]);
      await service.listSessions();
      expect(prisma.khuralSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {},
      }));
    });
  });

  // ─── getSession ────────────────────────
  describe('getSession', () => {
    it('should return session with votes', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(mockSession);
      const result = await service.getSession('s-1');
      expect(result.id).toBe('s-1');
    });

    it('should throw NotFoundException for missing session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(null);
      await expect(service.getSession('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── startSession ──────────────────────
  describe('startSession', () => {
    it('should start a SCHEDULED session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(mockSession);
      prisma.khuralSession.update.mockResolvedValue({ ...mockSession, status: 'IN_PROGRESS' });
      const result = await service.startSession('s-1', 'chair-1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw BadRequestException for non-SCHEDULED session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue({ ...mockSession, status: 'IN_PROGRESS' });
      await expect(service.startSession('s-1', 'chair-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not convener', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(mockSession);
      await expect(service.startSession('s-1', 'other')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── completeSession ───────────────────
  describe('completeSession', () => {
    const inProgressSession = { ...mockSession, status: 'IN_PROGRESS', votes: [{ vote: 'FOR' }, { vote: 'FOR' }, { vote: 'AGAINST' }] };

    it('should complete session and check quorum', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(inProgressSession);
      prisma.khuralSession.update.mockResolvedValue({ ...inProgressSession, status: 'COMPLETED', quorumMet: true });
      const result = await service.completeSession('s-1', 'chair-1', 'Budget approved');
      expect(result.status).toBe('COMPLETED');
      expect(result.quorumMet).toBe(true);
    });

    it('should throw BadRequestException for non-IN_PROGRESS session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(mockSession); // SCHEDULED
      await expect(service.completeSession('s-1', 'chair-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not convener', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(inProgressSession);
      await expect(service.completeSession('s-1', 'other')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── castVote ──────────────────────────
  describe('castVote', () => {
    const activeSession = { ...mockSession, status: 'IN_PROGRESS', entityId: 'rep-1' };

    beforeEach(() => {
      prisma.khuralSession.findUnique.mockResolvedValue(activeSession);
    });

    it('should cast vote as legislative Tumen leader with family arban', async () => {
      prisma.tumen.findFirst.mockResolvedValue(mockTumen);
      prisma.familyArban.findFirst.mockResolvedValue({ husbandSeatId: 'leader-1' });
      prisma.khuralVote.findUnique.mockResolvedValue(null);
      prisma.khuralVote.create.mockResolvedValue({ vote: 'FOR', sessionId: 's-1' });
      const result = await service.castVote('s-1', 'leader-1', { vote: 'FOR' });
      expect(result.vote).toBe('FOR');
    });

    it('should throw NotFoundException for missing session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(null);
      await expect(service.castVote('bad', 'leader-1', { vote: 'FOR' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-IN_PROGRESS session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue({ ...activeSession, status: 'COMPLETED' });
      await expect(service.castVote('s-1', 'leader-1', { vote: 'FOR' })).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for non-Tumen leader', async () => {
      prisma.tumen.findFirst.mockResolvedValue(null);
      await expect(service.castVote('s-1', 'nobody', { vote: 'FOR' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-legislative Tumen (no republicId)', async () => {
      prisma.tumen.findFirst.mockResolvedValue({ ...mockTumen, republicId: null });
      await expect(service.castVote('s-1', 'leader-1', { vote: 'FOR' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-family representative', async () => {
      prisma.tumen.findFirst.mockResolvedValue(mockTumen);
      prisma.familyArban.findFirst.mockResolvedValue(null);
      await expect(service.castVote('s-1', 'leader-1', { vote: 'FOR' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for Tumen not in the same republic', async () => {
      prisma.tumen.findFirst.mockResolvedValue({ ...mockTumen, republicId: 'rep-other' });
      prisma.familyArban.findFirst.mockResolvedValue({ husbandSeatId: 'leader-1' });
      await expect(service.castVote('s-1', 'leader-1', { vote: 'FOR' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when already voted', async () => {
      prisma.tumen.findFirst.mockResolvedValue(mockTumen);
      prisma.familyArban.findFirst.mockResolvedValue({ husbandSeatId: 'leader-1' });
      prisma.khuralVote.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.castVote('s-1', 'leader-1', { vote: 'FOR' })).rejects.toThrow(BadRequestException);
    });

    it('should cast AGAINST vote with comment', async () => {
      prisma.tumen.findFirst.mockResolvedValue(mockTumen);
      prisma.familyArban.findFirst.mockResolvedValue({ husbandSeatId: 'leader-1' });
      prisma.khuralVote.findUnique.mockResolvedValue(null);
      prisma.khuralVote.create.mockResolvedValue({ vote: 'AGAINST', comment: 'Too expensive' });
      const result = await service.castVote('s-1', 'leader-1', { vote: 'AGAINST', comment: 'Too expensive' });
      expect(result.vote).toBe('AGAINST');
    });
  });

  // ─── getVoteResults ────────────────────
  describe('getVoteResults', () => {
    it('should return vote results with breakdown', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue({
        ...mockSession, status: 'COMPLETED', quorumMet: true,
        votes: [
          { vote: 'FOR', voter: { id: 'v1' }, tumen: { id: 't1' } },
          { vote: 'FOR', voter: { id: 'v2' }, tumen: { id: 't2' } },
          { vote: 'AGAINST', voter: { id: 'v3' }, tumen: { id: 't3' } },
          { vote: 'ABSTAIN', voter: { id: 'v4' }, tumen: { id: 't4' } },
        ],
      });
      const result = await service.getVoteResults('s-1');
      expect(result.results.for).toBe(2);
      expect(result.results.against).toBe(1);
      expect(result.results.abstain).toBe(1);
      expect(result.results.total).toBe(4);
      expect(result.results.passed).toBe(true); // 2 > 1 and quorumMet
    });

    it('should return passed=false when against >= for', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue({
        ...mockSession, quorumMet: true,
        votes: [
          { vote: 'FOR', voter: { id: 'v1' }, tumen: { id: 't1' } },
          { vote: 'AGAINST', voter: { id: 'v2' }, tumen: { id: 't2' } },
          { vote: 'AGAINST', voter: { id: 'v3' }, tumen: { id: 't3' } },
        ],
      });
      const result = await service.getVoteResults('s-1');
      expect(result.results.passed).toBe(false);
    });

    it('should return passed=false when quorum not met', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue({
        ...mockSession, quorumMet: false,
        votes: [{ vote: 'FOR', voter: { id: 'v1' }, tumen: { id: 't1' } }],
      });
      const result = await service.getVoteResults('s-1');
      expect(result.results.passed).toBe(false);
    });

    it('should throw NotFoundException for missing session', async () => {
      prisma.khuralSession.findUnique.mockResolvedValue(null);
      await expect(service.getVoteResults('bad')).rejects.toThrow(NotFoundException);
    });
  });
});
