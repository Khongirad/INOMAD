import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ElectionService } from './election.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ElectionService', () => {
  let service: ElectionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      election: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      electionCandidate: {
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      organization: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      organizationMember: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ElectionService>(ElectionService);
  });

  describe('createElection', () => {
    it('should reject non-existent organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        service.createElection({
          organizationId: 'bad', startDate: new Date(), endDate: new Date(), creatorId: 'u1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject non-leader creator', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', children: [] });
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(
        service.createElection({
          organizationId: 'org1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-15'),
          creatorId: 'u1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when active election exists', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org1', children: [] });
      prisma.organizationMember.findFirst.mockResolvedValue({ role: 'LEADER' });
      prisma.election.findFirst.mockResolvedValue({ id: 'existing', status: 'ACTIVE' });
      await expect(
        service.createElection({
          organizationId: 'org1',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-15'),
          creatorId: 'u1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create election successfully', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org1', children: [],
      });
      prisma.organizationMember.findFirst.mockResolvedValue({ role: 'LEADER' });
      prisma.election.findFirst.mockResolvedValue(null);
      prisma.election.create.mockResolvedValue({
        id: 'e1', status: 'UPCOMING', organizationId: 'org1',
      });
      const result = await service.createElection({
        organizationId: 'org1',
        startDate: new Date('2030-03-01'),
        endDate: new Date('2030-03-15'),
        creatorId: 'u1',
      });
      expect(result.id).toBe('e1');
    });
  });

  describe('vote', () => {
    it('should reject vote on non-active election', async () => {
      prisma.election.findUnique.mockResolvedValue({ id: 'e1', status: 'UPCOMING' });
      await expect(
        service.vote({ electionId: 'e1', voterId: 'u1', candidateId: 'c1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cast vote on active election', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      const future = new Date(now.getTime() + 86400000);
      prisma.election.findUnique.mockResolvedValue({
        id: 'e1', status: 'ACTIVE', organizationId: 'org1',
        startDate: past, endDate: future, organization: {},
      });
      prisma.organizationMember.findFirst.mockResolvedValue({ userId: 'u1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', citizenType: 'INDIGENOUS' });
      prisma.electionCandidate.findFirst.mockResolvedValue({ id: 'cand-1' });

      await service.vote({ electionId: 'e1', voterId: 'u1', candidateId: 'c1' });
      expect(prisma.electionCandidate.update).toHaveBeenCalled();
    });
  });

  describe('getElection', () => {
    it('should return election details', async () => {
      prisma.election.findUnique.mockResolvedValue({ id: 'e1', status: 'ACTIVE' });
      const result = await service.getElection('e1');
      expect(result.id).toBe('e1');
    });
  });

  describe('cancelElection', () => {
    it('should reject cancelling completed election', async () => {
      prisma.election.findUnique.mockResolvedValue({ id: 'e1', status: 'COMPLETED' });
      await expect(service.cancelElection('e1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should cancel active election', async () => {
      prisma.election.findUnique.mockResolvedValue({ id: 'e1', status: 'ACTIVE' });
      prisma.election.update.mockResolvedValue({ id: 'e1', status: 'CANCELLED' });
      const result = await service.cancelElection('e1', 'u1');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('getActiveElections', () => {
    it('should return active elections', async () => {
      prisma.election.findMany.mockResolvedValue([{ id: 'e1', status: 'ACTIVE' }]);
      const result = await service.getActiveElections();
      expect(result).toHaveLength(1);
    });
  });

  describe('activateUpcomingElections', () => {
    it('should return count of activated elections', async () => {
      prisma.election.updateMany.mockResolvedValue({ count: 2 });
      const result = await service.activateUpcomingElections();
      expect(result).toBe(2);
    });
  });
});
