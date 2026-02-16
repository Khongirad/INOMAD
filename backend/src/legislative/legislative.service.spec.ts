import { Test, TestingModule } from '@nestjs/testing';
import { LegislativeService } from './legislative.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('LegislativeService', () => {
  let service: LegislativeService;
  let prisma: any;

  const mockProposal = {
    id: 'prop-1', authorId: 'author-1', title: 'Tax Reform', description: 'Reform taxes',
    fullText: 'Full text...', category: 'ECONOMIC', khuralLevel: 'ARBAN', entityId: 'entity-1',
    status: 'DRAFT', votesFor: 0, votesAgainst: 0, votesAbstain: 0,
  };

  const mockUser = { id: 'author-1', hasExclusiveLandRight: true };

  const mockPrisma = () => ({
    legislativeProposal: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn(),
    },
    proposalDebate: { create: jest.fn() },
    proposalVote: { findUnique: jest.fn(), create: jest.fn(), groupBy: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn((args) => Promise.all(args)),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegislativeService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(LegislativeService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createProposal ────────────────────
  describe('createProposal', () => {
    it('should create a DRAFT proposal for eligible user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.legislativeProposal.create.mockResolvedValue({ ...mockProposal, status: 'DRAFT' });
      const dto = { title: 'Tax Reform', description: 'Reform', fullText: 'Full', category: 'ECONOMIC', khuralLevel: 'ARBAN', entityId: 'e1' };
      const result = await service.createProposal('author-1', dto);
      expect(result.status).toBe('DRAFT');
    });

    it('should throw ForbiddenException for ineligible user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', hasExclusiveLandRight: false });
      prisma.user.findFirst.mockResolvedValue(null); // no delegate
      const dto = { title: 'T', description: 'D', fullText: 'F', category: 'C', khuralLevel: 'K', entityId: 'e1' };
      await expect(service.createProposal('u1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow delegated representative', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'delegate', hasExclusiveLandRight: false });
      prisma.user.findFirst.mockResolvedValue({ id: 'land-holder' }); // delegate found
      prisma.legislativeProposal.create.mockResolvedValue({ ...mockProposal });
      const dto = { title: 'T', description: 'D', fullText: 'F', category: 'C', khuralLevel: 'K', entityId: 'e1' };
      const result = await service.createProposal('delegate', dto);
      expect(result).toBeDefined();
    });
  });

  // ─── getProposal ───────────────────────
  describe('getProposal', () => {
    it('should return proposal with relations', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue(mockProposal);
      const result = await service.getProposal('prop-1');
      expect(result.id).toBe('prop-1');
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue(null);
      await expect(service.getProposal('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listProposals ─────────────────────
  describe('listProposals', () => {
    it('should return paginated proposals', async () => {
      prisma.legislativeProposal.findMany.mockResolvedValue([mockProposal]);
      prisma.legislativeProposal.count.mockResolvedValue(1);
      const result = await service.listProposals({ status: 'DRAFT', page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
    it('should apply all filters', async () => {
      prisma.legislativeProposal.findMany.mockResolvedValue([]);
      prisma.legislativeProposal.count.mockResolvedValue(0);
      await service.listProposals({
        status: 'VOTING', khuralLevel: 'TUMEN', entityId: 'e1', authorId: 'a1', category: 'ECONOMIC',
      });
      expect(prisma.legislativeProposal.findMany).toHaveBeenCalled();
    });
  });

  // ─── submitProposal ────────────────────
  describe('submitProposal', () => {
    it('should transition DRAFT → SUBMITTED', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DRAFT' });
      prisma.legislativeProposal.update.mockResolvedValue({ ...mockProposal, status: 'SUBMITTED' });
      const result = await service.submitProposal('prop-1', 'author-1');
      expect(result.status).toBe('SUBMITTED');
    });
    it('should throw ForbiddenException if not author', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DRAFT' });
      await expect(service.submitProposal('prop-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not DRAFT status', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'SUBMITTED' });
      await expect(service.submitProposal('prop-1', 'author-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── openDebate ────────────────────────
  describe('openDebate', () => {
    it('should transition SUBMITTED → DEBATE', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'SUBMITTED' });
      prisma.legislativeProposal.update.mockResolvedValue({ ...mockProposal, status: 'DEBATE' });
      const result = await service.openDebate('prop-1');
      expect(result.status).toBe('DEBATE');
    });
    it('should throw BadRequestException if not SUBMITTED', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DRAFT' });
      await expect(service.openDebate('prop-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── addDebateEntry ────────────────────
  describe('addDebateEntry', () => {
    it('should add debate entry from eligible speaker', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DEBATE' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.proposalDebate.create.mockResolvedValue({ id: 'd1', content: 'My speech' });
      const result = await service.addDebateEntry('prop-1', 'author-1', 'My speech');
      expect(result.content).toBe('My speech');
    });
    it('should throw BadRequestException if not in DEBATE status', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'VOTING' });
      await expect(service.addDebateEntry('prop-1', 'author-1', 'text')).rejects.toThrow(BadRequestException);
    });
    it('should support replyToId for threaded debates', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DEBATE' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.proposalDebate.create.mockResolvedValue({ id: 'd2', replyToId: 'd1' });
      const result = await service.addDebateEntry('prop-1', 'author-1', 'Reply', 'd1');
      expect(result.replyToId).toBe('d1');
    });
  });

  // ─── openVoting ────────────────────────
  describe('openVoting', () => {
    it('should transition DEBATE → VOTING', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DEBATE' });
      prisma.legislativeProposal.update.mockResolvedValue({ ...mockProposal, status: 'VOTING' });
      const result = await service.openVoting('prop-1');
      expect(result.status).toBe('VOTING');
    });
    it('should throw BadRequestException if not DEBATE', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'SUBMITTED' });
      await expect(service.openVoting('prop-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── castVote ──────────────────────────
  describe('castVote', () => {
    beforeEach(() => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'VOTING' });
      prisma.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should cast a FOR vote and update cached counts', async () => {
      prisma.proposalVote.findUnique.mockResolvedValue(null);
      prisma.proposalVote.create.mockResolvedValue({ vote: 'FOR' });
      prisma.proposalVote.groupBy.mockResolvedValue([
        { vote: 'FOR', _count: 5 },
        { vote: 'AGAINST', _count: 2 },
      ]);
      prisma.legislativeProposal.update.mockResolvedValue({});
      const result = await service.castVote('prop-1', 'author-1', 'FOR', 'Great');
      expect(result.vote).toBe('FOR');
      expect(prisma.legislativeProposal.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ votesFor: 5, votesAgainst: 2 }),
      }));
    });

    it('should throw BadRequestException if already voted', async () => {
      prisma.proposalVote.findUnique.mockResolvedValue({ id: 'v1' });
      await expect(service.castVote('prop-1', 'author-1', 'FOR')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not in VOTING status', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'DEBATE' });
      await expect(service.castVote('prop-1', 'author-1', 'FOR')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── finalizeVoting ────────────────────
  describe('finalizeVoting', () => {
    it('should pass proposal when FOR > AGAINST', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({
        ...mockProposal, status: 'VOTING', votesFor: 10, votesAgainst: 3, votesAbstain: 2,
      });
      prisma.legislativeProposal.update.mockResolvedValue({ status: 'PASSED' });
      const result = await service.finalizeVoting('prop-1');
      expect(result.status).toBe('PASSED');
    });
    it('should reject proposal when AGAINST >= FOR', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({
        ...mockProposal, status: 'VOTING', votesFor: 3, votesAgainst: 10, votesAbstain: 0,
      });
      prisma.legislativeProposal.update.mockResolvedValue({ status: 'REJECTED' });
      const result = await service.finalizeVoting('prop-1');
      expect(result.status).toBe('REJECTED');
    });
    it('should reject when no votes (no quorum)', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({
        ...mockProposal, status: 'VOTING', votesFor: 0, votesAgainst: 0, votesAbstain: 0,
      });
      prisma.legislativeProposal.update.mockResolvedValue({ status: 'REJECTED' });
      const result = await service.finalizeVoting('prop-1');
      expect(result.status).toBe('REJECTED');
    });
  });

  // ─── signLaw ───────────────────────────
  describe('signLaw', () => {
    it('should transition PASSED → SIGNED', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'PASSED' });
      prisma.legislativeProposal.update.mockResolvedValue({ ...mockProposal, status: 'SIGNED', signedById: 'signer-1' });
      const result = await service.signLaw('prop-1', 'signer-1');
      expect(result.status).toBe('SIGNED');
    });
    it('should throw BadRequestException if not PASSED', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'VOTING' });
      await expect(service.signLaw('prop-1', 'signer-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── archiveLaw ────────────────────────
  describe('archiveLaw', () => {
    it('should transition SIGNED → ARCHIVED', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'SIGNED' });
      prisma.legislativeProposal.update.mockResolvedValue({ ...mockProposal, status: 'ARCHIVED' });
      const result = await service.archiveLaw('prop-1');
      expect(result.status).toBe('ARCHIVED');
    });
    it('should allow linking a document', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'SIGNED' });
      prisma.legislativeProposal.update.mockResolvedValue({ ...mockProposal, status: 'ARCHIVED', documentId: 'doc-1' });
      const result = await service.archiveLaw('prop-1', 'doc-1');
      expect(result.documentId).toBe('doc-1');
    });
    it('should throw BadRequestException if not SIGNED', async () => {
      prisma.legislativeProposal.findUnique.mockResolvedValue({ ...mockProposal, status: 'PASSED' });
      await expect(service.archiveLaw('prop-1')).rejects.toThrow(BadRequestException);
    });
  });
});
