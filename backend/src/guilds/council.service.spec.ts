import { Test, TestingModule } from '@nestjs/testing';
import { CouncilService } from './council.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CouncilService', () => {
  let service: CouncilService;
  let prisma: any;

  const mockMember = { userId: 'u1', level: 5, xp: 1000, user: { id: 'u1', seatId: 'S-1' } };

  const mockPrisma = () => ({
    guildMember: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    khuralEventVersion: { create: jest.fn(), update: jest.fn() },
    councilVote: { findUnique: jest.fn(), create: jest.fn(), count: jest.fn() },
    khuralEvent: { update: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouncilService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(CouncilService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── getCouncilMembers ─────────────────
  describe('getCouncilMembers', () => {
    it('should return top 10 members for guild', async () => {
      prisma.guildMember.findMany.mockResolvedValue([mockMember]);
      const result = await service.getCouncilMembers('g1');
      expect(result).toHaveLength(1);
    });

    it('should return global top 10 without guildId', async () => {
      prisma.guildMember.findMany.mockResolvedValue([mockMember]);
      const result = await service.getCouncilMembers();
      expect(result).toHaveLength(1);
    });
  });

  // ─── proposeVersion ────────────────────
  describe('proposeVersion', () => {
    it('should create version proposal', async () => {
      prisma.khuralEventVersion.create.mockResolvedValue({
        id: 'v1', eventId: 'e1', title: 'New Title',
      });
      const result = await service.proposeVersion('e1', 'New Title', 'New Desc', 'u1');
      expect(result.title).toBe('New Title');
    });
  });

  // ─── castVote ──────────────────────────
  describe('castVote', () => {
    it('should cast vote and return approval count', async () => {
      prisma.councilVote.findUnique.mockResolvedValue(null);
      prisma.councilVote.create.mockResolvedValue({});
      prisma.councilVote.count.mockResolvedValue(3);
      const result = await service.castVote('v1', 'u1', true);
      expect(result.voted).toBe(true);
      expect(result.currentApprovals).toBe(3);
    });

    it('should throw if already voted', async () => {
      prisma.councilVote.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.castVote('v1', 'u1', true)).rejects.toThrow('Already voted');
    });

    it('should trigger approval at 6 votes', async () => {
      prisma.councilVote.findUnique.mockResolvedValue(null);
      prisma.councilVote.create.mockResolvedValue({});
      prisma.councilVote.count.mockResolvedValue(6);
      prisma.khuralEventVersion.update.mockResolvedValue({ id: 'v1', eventId: 'e1', title: 'T', description: 'D' });
      prisma.khuralEvent.update.mockResolvedValue({});
      const result = await service.castVote('v1', 'u1', true);
      expect(result.currentApprovals).toBe(6);
    });
  });
});
