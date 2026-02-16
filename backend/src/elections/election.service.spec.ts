import { Test, TestingModule } from '@nestjs/testing';
import { ElectionService } from './election.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ElectionService', () => {
  let service: ElectionService;
  let prisma: any;

  const mockElection = {
    id: 'e1', organizationId: 'org-1', status: 'ACTIVE',
    startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000),
    totalVotes: 5, isAnonymous: false, termMonths: 12,
    organization: { id: 'org-1', ownershipType: 'PUBLIC' },
    candidates: [
      { id: 'ec-1', candidateId: 'c1', votes: 3, candidate: { id: 'c1', username: 'alice' } },
      { id: 'ec-2', candidateId: 'c2', votes: 2, candidate: { id: 'c2', username: 'bob' } },
    ],
  };

  const mockPrisma = () => ({
    organization: { findUnique: jest.fn(), update: jest.fn() },
    organizationMember: { findFirst: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    election: {
      create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
      findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
    },
    electionCandidate: { create: jest.fn(), createMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    orgShareholder: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(ElectionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createElection ────────────────────
  describe('createElection', () => {
    it('should create election with auto-candidates', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        children: [{ leaderId: 'l1', leader: {} }, { leaderId: 'l2', leader: {} }],
      });
      prisma.organizationMember.findFirst.mockResolvedValue({ role: 'LEADER' });
      prisma.election.findFirst.mockResolvedValue(null); // no active
      prisma.election.create.mockResolvedValue(mockElection);
      prisma.electionCandidate.createMany.mockResolvedValue({ count: 2 });
      const result = await service.createElection({
        organizationId: 'org-1', creatorId: 'u1',
        startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 172800000),
      });
      expect(result.id).toBe('e1');
      expect(prisma.electionCandidate.createMany).toHaveBeenCalled();
    });

    it('should throw if org not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.createElection({
        organizationId: 'bad', creatorId: 'u1',
        startDate: new Date(), endDate: new Date(),
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw if creator is not leader', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', children: [] });
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.createElection({
        organizationId: 'org-1', creatorId: 'u1',
        startDate: new Date(), endDate: new Date(),
      })).rejects.toThrow(ForbiddenException);
    });

    it('should throw if active election exists', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', children: [] });
      prisma.organizationMember.findFirst.mockResolvedValue({ role: 'LEADER' });
      prisma.election.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.createElection({
        organizationId: 'org-1', creatorId: 'u1',
        startDate: new Date(), endDate: new Date(),
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── addCandidate ─────────────────────
  describe('addCandidate', () => {
    it('should add candidate', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.organizationMember.findFirst.mockResolvedValue({ userId: 'c3' });
      prisma.electionCandidate.create.mockResolvedValue({ id: 'ec-3', candidateId: 'c3' });
      const result = await service.addCandidate('e1', 'c3', 'My platform');
      expect(result.candidateId).toBe('c3');
    });

    it('should throw if election completed', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, status: 'COMPLETED' });
      await expect(service.addCandidate('e1', 'c3')).rejects.toThrow(BadRequestException);
    });

    it('should throw if not org member', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.addCandidate('e1', 'c3')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── vote ─────────────────────────────
  describe('vote', () => {
    it('should cast vote for public org (weight 1)', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.organizationMember.findFirst.mockResolvedValue({ userId: 'v1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'CITIZEN' });
      prisma.electionCandidate.findFirst.mockResolvedValue(mockElection.candidates[0]);
      prisma.electionCandidate.update.mockResolvedValue({});
      prisma.election.update.mockResolvedValue({});
      await service.vote({ electionId: 'e1', voterId: 'v1', candidateId: 'c1' });
      expect(prisma.electionCandidate.update).toHaveBeenCalled();
    });

    it('should throw if election not active', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, status: 'UPCOMING' });
      await expect(service.vote({ electionId: 'e1', voterId: 'v1', candidateId: 'c1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if voter is RESIDENT', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.organizationMember.findFirst.mockResolvedValue({ userId: 'v1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'v1', citizenType: 'RESIDENT' });
      await expect(service.vote({ electionId: 'e1', voterId: 'v1', candidateId: 'c1' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ─── completeElection ─────────────────
  describe('completeElection', () => {
    it('should complete election and assign leader', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.organizationMember.count.mockResolvedValue(10);
      prisma.election.update.mockResolvedValue({ ...mockElection, status: 'COMPLETED', winnerId: 'c1' });
      prisma.organization.update.mockResolvedValue({});
      prisma.organizationMember.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.completeElection('e1', 'admin');
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw if already completed', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, status: 'COMPLETED' });
      await expect(service.completeElection('e1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should throw if no candidates', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, candidates: [] });
      await expect(service.completeElection('e1', 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancelElection ───────────────────
  describe('cancelElection', () => {
    it('should cancel election', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.election.update.mockResolvedValue({ ...mockElection, status: 'CANCELLED' });
      const result = await service.cancelElection('e1', 'admin');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw for completed election', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, status: 'COMPLETED' });
      await expect(service.cancelElection('e1', 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getElection ──────────────────────
  describe('getElection', () => {
    it('should return election details', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      const result = await service.getElection('e1');
      expect(result!.id).toBe('e1');
    });

    it('should hide votes for anonymous active election', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, isAnonymous: true });
      const result = await service.getElection('e1');
      expect(result!.candidates[0].votes).toBeUndefined();
    });
  });

  // ─── cron jobs ────────────────────────
  describe('activateUpcomingElections', () => {
    it('should activate upcoming elections', async () => {
      prisma.election.updateMany.mockResolvedValue({ count: 2 });
      const result = await service.activateUpcomingElections();
      expect(result).toBe(2);
    });
  });

  describe('autoCompleteElections', () => {
    it('should auto-complete expired elections', async () => {
      const activeElection = {
        ...mockElection, status: 'ACTIVE',
        candidates: [
          { id: 'ec-1', candidateId: 'c1', votes: 3, candidate: { id: 'c1', username: 'alice' } },
        ],
      };
      prisma.election.findMany.mockResolvedValue([activeElection]);
      // completeElection calls findUnique internally
      prisma.election.findUnique.mockResolvedValue({
        ...activeElection, organization: { id: 'org-1', ownershipType: 'PUBLIC' },
      });
      prisma.organizationMember.count.mockResolvedValue(10);
      prisma.election.update.mockResolvedValue({ status: 'COMPLETED' });
      prisma.organization.update.mockResolvedValue({});
      prisma.organizationMember.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.autoCompleteElections();
      expect(result).toBe(1);
    });
  });

  // ─── vote edge cases ─────────────────
  describe('vote edge cases', () => {
    it('should throw if voter is not organization member', async () => {
      prisma.election.findUnique.mockResolvedValue(mockElection);
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.vote({ electionId: 'e1', voterId: 'v1', candidateId: 'c1' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw if election not active', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, status: 'COMPLETED' });
      await expect(service.vote({ electionId: 'e1', voterId: 'v1', candidateId: 'c1' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── listing endpoints ───────────────
  describe('getOrganizationElections', () => {
    it('should return elections for an organization', async () => {
      prisma.election.findMany.mockResolvedValue([mockElection]);
      const result = await service.getOrganizationElections('org-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getActiveElections', () => {
    it('should return active elections', async () => {
      prisma.election.findMany.mockResolvedValue([mockElection]);
      const result = await service.getActiveElections();
      expect(result).toHaveLength(1);
    });
  });

  describe('getUpcomingElections', () => {
    it('should return upcoming elections', async () => {
      prisma.election.findMany.mockResolvedValue([]);
      const result = await service.getUpcomingElections();
      expect(result).toHaveLength(0);
    });
  });

  // ─── cancelElection edge cases ────────
  describe('cancelElection edge cases', () => {
    it('should throw if election not found', async () => {
      prisma.election.findUnique.mockResolvedValue(null);
      await expect(service.cancelElection('bad', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw if already completed', async () => {
      prisma.election.findUnique.mockResolvedValue({ ...mockElection, status: 'COMPLETED' });
      await expect(service.cancelElection('e1', 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── completeElection edge cases ──────
  describe('completeElection edge cases', () => {
    it('should throw if election not found', async () => {
      prisma.election.findUnique.mockResolvedValue(null);
      await expect(service.completeElection('bad', 'admin')).rejects.toThrow(NotFoundException);
    });
  });
});
