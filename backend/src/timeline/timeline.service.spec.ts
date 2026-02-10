import { Test, TestingModule } from '@nestjs/testing';
import { TimelineService } from './timeline.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TimelineService', () => {
  let service: TimelineService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      timelineEvent: {
        create: jest.fn().mockResolvedValue({ id: 'te-1', type: 'BIRTH' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimelineService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TimelineService>(TimelineService);
  });

  describe('createEvent', () => {
    it('should create timeline event', async () => {
      const result = await service.createEvent({ type: 'BIRTH' as any, title: 'Born' });
      expect(result.id).toBe('te-1');
    });
  });

  describe('getUserTimeline', () => {
    it('should return user events', async () => {
      await service.getUserTimeline('u1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });

    it('should apply scope and type filters', async () => {
      await service.getUserTimeline('u1', {
        scope: ['FAMILY' as any],
        types: ['BIRTH' as any],
        limit: 10,
      });
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
  });

  describe('getHierarchicalTimeline', () => {
    it('should filter by FAMILY scope', async () => {
      await service.getHierarchicalTimeline('FAMILY' as any, 'fam-1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
  });

  describe('recordContract', () => {
    it('should create legal contract event', async () => {
      const result = await service.recordContract({
        type: 'LEGAL_CONTRACT' as any, actorId: 'u1', title: 'Agreement',
        contractHash: '0xabc', witnessIds: ['w1'],
      });
      expect(result.id).toBe('te-1');
    });
  });

  describe('getUserContracts', () => {
    it('should return user contracts', async () => {
      await service.getUserContracts('u1');
      expect(prisma.timelineEvent.findMany).toHaveBeenCalled();
    });
  });

  describe('getEvent', () => {
    it('should return event by ID', async () => {
      prisma.timelineEvent.findUnique.mockResolvedValue({ id: 'te-1' });
      const result = await service.getEvent('te-1');
      expect(result.id).toBe('te-1');
    });
  });
});
