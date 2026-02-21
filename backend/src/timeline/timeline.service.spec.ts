import { Test, TestingModule } from '@nestjs/testing';
import { TimelineService } from './timeline.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TimelineService', () => {
  let service: TimelineService;
  let prisma: any;

  const mockEvent = {
    id: 'e1', type: 'QUEST_COMPLETED', scope: 'INDIVIDUAL',
    title: 'Quest Done', description: 'Desc', actorId: 'u1', targetId: 'u2',
    location: null, timezone: 'UTC', familyId: null, clanId: null, arbadId: null,
    hordeId: null, nationId: null, isLegalContract: false, contractHash: null,
    witnessIds: [], metadata: null, ipAddress: null, userAgent: null, taskId: null,
    createdAt: new Date(), actor: { id: 'u1', username: 'actor' },
    target: { id: 'u2', username: 'target' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue(mockEvent),
        findMany: jest.fn().mockResolvedValue([mockEvent]),
        findUnique: jest.fn().mockResolvedValue({ ...mockEvent, verification: null }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TimelineService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createEvent', () => {
    it('creates event with defaults', async () => {
      const r = await service.createEvent({ type: 'QUEST_COMPLETED' as any, title: 'Test' });
      expect(r.id).toBe('e1');
      expect(prisma.timelineEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scope: 'INDIVIDUAL', timezone: 'UTC', isLegalContract: false, witnessIds: [],
          }),
        }),
      );
    });
    it('creates event with all fields', async () => {
      await service.createEvent({
        type: 'MARRIAGE_REGISTERED' as any, scope: 'FAMILY' as any,
        title: 'Marriage', description: 'Desc', actorId: 'u1', targetId: 'u2',
        location: 'City', timezone: 'Asia/Ulaanbaatar', familyId: 'f1',
        clanId: 'c1', arbadId: 'a1', hordeId: 'h1', nationId: 'n1',
        isLegalContract: true, contractHash: '0xabc', witnessIds: ['w1'],
        metadata: { key: 'val' }, ipAddress: '1.2.3.4', userAgent: 'test', taskId: 't1',
      });
      expect(prisma.timelineEvent.create).toHaveBeenCalled();
    });
  });

  describe('getUserTimeline', () => {
    it('returns timeline without options', async () => {
      const r = await service.getUserTimeline('u1');
      expect(r).toHaveLength(1);
    });
    it('applies scope filter', async () => {
      await service.getUserTimeline('u1', { scope: ['FAMILY' as any] });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scope: { in: ['FAMILY'] } }),
        }),
      );
    });
    it('applies type filter', async () => {
      await service.getUserTimeline('u1', { types: ['QUEST_COMPLETED' as any] });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: { in: ['QUEST_COMPLETED'] } }),
        }),
      );
    });
    it('applies date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      await service.getUserTimeline('u1', { from, to });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from, lte: to },
          }),
        }),
      );
    });
    it('applies from-only date', async () => {
      const from = new Date('2024-01-01');
      await service.getUserTimeline('u1', { from });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
    it('applies limit', async () => {
      await service.getUserTimeline('u1', { limit: 10 });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  describe('getHierarchicalTimeline', () => {
    it('handles FAMILY scope', async () => {
      await service.getHierarchicalTimeline('FAMILY' as any, 'f1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ familyId: 'f1' }),
        }),
      );
    });
    it('handles CLAN scope', async () => {
      await service.getHierarchicalTimeline('CLAN' as any, 'c1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
    it('handles ARBAD scope', async () => {
      await service.getHierarchicalTimeline('ARBAD' as any, 'a1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
    it('handles HORDE scope', async () => {
      await service.getHierarchicalTimeline('HORDE' as any, 'h1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
    it('handles NATION scope', async () => {
      await service.getHierarchicalTimeline('NATION' as any, 'n1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
    it('handles CONFEDERATION scope', async () => {
      await service.getHierarchicalTimeline('CONFEDERATION' as any, 'all');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
    it('applies type filter and date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      await service.getHierarchicalTimeline('ARBAD' as any, 'a1', {
        types: ['QUEST_COMPLETED' as any], from, to, limit: 5,
      });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
    it('applies from-only date', async () => {
      await service.getHierarchicalTimeline('FAMILY' as any, 'f1', {
        from: new Date('2024-01-01'),
      });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
  });

  describe('recordContract', () => {
    it('records a legal contract event', async () => {
      const r = await service.recordContract({
        type: 'CONTRACT_SIGNED' as any, actorId: 'u1',
        title: 'Contract', contractHash: '0xabc', witnessIds: ['w1'],
      });
      expect(r.id).toBe('e1');
    });
    it('passes scope override', async () => {
      await service.recordContract({
        type: 'CONTRACT_SIGNED' as any, actorId: 'u1', scope: 'ARBAD' as any,
        title: 'Contract', contractHash: '0xabc', witnessIds: ['w1'],
      });
      expect(prisma.timelineEvent.create).toHaveBeenCalled();
    });
  });

  describe('getUserContracts', () => {
    it('returns user contracts', async () => {
      const r = await service.getUserContracts('u1');
      expect(r).toHaveLength(1);
    });
  });

  describe('getEvent', () => {
    it('returns event by id', async () => {
      const r = await service.getEvent('e1');
      expect(r.id).toBe('e1');
    });
    it('returns null when not found', async () => {
      prisma.timelineEvent.findUnique.mockResolvedValue(null);
      const r = await service.getEvent('bad');
      expect(r).toBeNull();
    });
  });
});
