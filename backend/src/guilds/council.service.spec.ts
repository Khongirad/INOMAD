import { Test, TestingModule } from '@nestjs/testing';
import { CouncilService } from './council.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CouncilService', () => {
  let service: CouncilService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      guildMember: { findMany: jest.fn().mockResolvedValue([]) },
      khuralEventVersion: { create: jest.fn().mockResolvedValue({ id: 'v-1' }), update: jest.fn() },
      councilVote: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn(),
      },
      khuralEvent: { update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CouncilService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CouncilService>(CouncilService);
  });

  describe('getCouncilMembers', () => {
    it('should get top 10 members', async () => {
      await service.getCouncilMembers('guild-1');
      expect(prisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('proposeVersion', () => {
    it('should create version proposal', async () => {
      const result = await service.proposeVersion('ev-1', 'New Title', 'New Desc', 'u1');
      expect(result.id).toBe('v-1');
    });
  });

  describe('castVote', () => {
    it('should throw if already voted', async () => {
      prisma.councilVote.findUnique.mockResolvedValue({ id: 'vote-1' });
      await expect(service.castVote('v-1', 'u1', true)).rejects.toThrow('Already voted');
    });

    it('should record vote and return approval count', async () => {
      prisma.councilVote.findUnique.mockResolvedValue(null);
      prisma.councilVote.count.mockResolvedValue(3);
      const result = await service.castVote('v-1', 'u1', true);
      expect(result.voted).toBe(true);
      expect(result.currentApprovals).toBe(3);
    });

    it('should auto-approve when consensus reached (6 votes)', async () => {
      prisma.councilVote.findUnique.mockResolvedValue(null);
      prisma.councilVote.count.mockResolvedValue(6);
      prisma.khuralEventVersion.update.mockResolvedValue({ id: 'v-1', eventId: 'ev-1' });
      await service.castVote('v-1', 'u1', true);
      expect(prisma.khuralEventVersion.update).toHaveBeenCalled();
    });
  });
});
