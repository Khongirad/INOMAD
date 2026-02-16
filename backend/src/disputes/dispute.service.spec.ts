import { Test, TestingModule } from '@nestjs/testing';
import { DisputeService } from './dispute.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DisputeService', () => {
  let service: DisputeService;
  let prisma: any;

  const mockDispute = {
    id: 'disp-1', partyAId: 'a1', partyBId: 'b1',
    title: 'Test Dispute', status: 'OPENED', sourceType: 'CONTRACT', sourceId: 'src-1',
    partyA: { id: 'a1', username: 'alice' },
    partyB: { id: 'b1', username: 'bob' },
    complaints: [],
  };

  const mockPrisma = () => ({
    dispute: {
      create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
      findMany: jest.fn(), update: jest.fn(), count: jest.fn(),
    },
    conversation: { create: jest.fn().mockResolvedValue({ id: 'conv-1' }) },
    notification: { create: jest.fn().mockResolvedValue({}) },
    documentContract: { findUnique: jest.fn() },
    quest: { findUnique: jest.fn() },
    workAct: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(DisputeService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── openDispute ───────────────────────
  describe('openDispute', () => {
    it('should open dispute with conversation', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({ id: 'src-1' });
      prisma.dispute.findFirst.mockResolvedValue(null); // no existing
      prisma.dispute.create.mockResolvedValue(mockDispute);
      const result = await service.openDispute('a1', {
        partyBId: 'b1', sourceType: 'CONTRACT' as any, sourceId: 'src-1',
        title: 'Test', description: 'desc',
      });
      expect(result.status).toBe('OPENED');
      expect(prisma.conversation.create).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should throw if dispute already exists on source', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({ id: 'src-1' });
      prisma.dispute.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.openDispute('a1', {
        partyBId: 'b1', sourceType: 'CONTRACT' as any, sourceId: 'src-1',
        title: 'T', description: 'd',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if source not found', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(null);
      await expect(service.openDispute('a1', {
        partyBId: 'b1', sourceType: 'CONTRACT' as any, sourceId: 'bad',
        title: 'T', description: 'd',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getDispute ────────────────────────
  describe('getDispute', () => {
    it('should return dispute', async () => {
      prisma.dispute.findUnique.mockResolvedValue(mockDispute);
      const result = await service.getDispute('disp-1');
      expect(result.id).toBe('disp-1');
    });

    it('should throw NotFoundException', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);
      await expect(service.getDispute('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listDisputes ─────────────────────
  describe('listDisputes', () => {
    it('should return paginated disputes', async () => {
      prisma.dispute.findMany.mockResolvedValue([mockDispute]);
      prisma.dispute.count.mockResolvedValue(1);
      const result = await service.listDisputes('a1');
      expect(result.total).toBe(1);
    });
  });

  // ─── startNegotiation ─────────────────
  describe('startNegotiation', () => {
    it('should mark as NEGOTIATING', async () => {
      prisma.dispute.update.mockResolvedValue({ ...mockDispute, status: 'NEGOTIATING' });
      const result = await service.startNegotiation('disp-1');
      expect(result.status).toBe('NEGOTIATING');
    });
  });

  // ─── settle ────────────────────────────
  describe('settle', () => {
    it('should settle dispute', async () => {
      prisma.dispute.findUnique.mockResolvedValue(mockDispute);
      prisma.dispute.update.mockResolvedValue({ ...mockDispute, status: 'SETTLED' });
      const result = await service.settle('disp-1', 'Agreed');
      expect(result.status).toBe('SETTLED');
    });

    it('should throw if already settled', async () => {
      prisma.dispute.findUnique.mockResolvedValue({ ...mockDispute, status: 'SETTLED' });
      await expect(service.settle('disp-1', 'Again')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── escalateToComplaint ──────────────
  describe('escalateToComplaint', () => {
    it('should escalate to complaint', async () => {
      prisma.dispute.findUnique.mockResolvedValue(mockDispute);
      prisma.dispute.update.mockResolvedValue({ ...mockDispute, status: 'COMPLAINT_FILED' });
      const result = await service.escalateToComplaint('disp-1');
      expect(result.dispute.status).toBe('COMPLAINT_FILED');
    });

    it('should throw if already closed', async () => {
      prisma.dispute.findUnique.mockResolvedValue({ ...mockDispute, status: 'COURT_FILED' });
      await expect(service.escalateToComplaint('disp-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── escalateToCourt ──────────────────
  describe('escalateToCourt', () => {
    it('should escalate directly to court', async () => {
      prisma.dispute.findUnique.mockResolvedValue(mockDispute);
      prisma.dispute.update.mockResolvedValue({ ...mockDispute, status: 'COURT_FILED' });
      const result = await service.escalateToCourt('disp-1');
      expect(result.status).toBe('COURT_FILED');
    });

    it('should throw if already SETTLED', async () => {
      prisma.dispute.findUnique.mockResolvedValue({ ...mockDispute, status: 'SETTLED' });
      await expect(service.escalateToCourt('disp-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if already COMPLAINT_FILED', async () => {
      prisma.dispute.findUnique.mockResolvedValue({ ...mockDispute, status: 'COMPLAINT_FILED' });
      await expect(service.escalateToCourt('disp-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── QUEST and WORK_ACT source types ──
  describe('openDispute with QUEST source', () => {
    it('should open dispute with QUEST source', async () => {
      prisma.quest.findUnique.mockResolvedValue({ id: 'q1' });
      prisma.dispute.findFirst.mockResolvedValue(null);
      prisma.dispute.create.mockResolvedValue({ ...mockDispute, sourceType: 'QUEST' });
      const result = await service.openDispute('a1', {
        partyBId: 'b1', sourceType: 'QUEST' as any, sourceId: 'q1',
        title: 'Quest dispute', description: 'desc',
      });
      expect(result.sourceType).toBe('QUEST');
    });
  });

  describe('openDispute with WORK_ACT source', () => {
    it('should open dispute with WORK_ACT source', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ id: 'wa1' });
      prisma.dispute.findFirst.mockResolvedValue(null);
      prisma.dispute.create.mockResolvedValue({ ...mockDispute, sourceType: 'WORK_ACT' });
      const result = await service.openDispute('a1', {
        partyBId: 'b1', sourceType: 'WORK_ACT' as any, sourceId: 'wa1',
        title: 'Work act dispute', description: 'desc',
      });
      expect(result.sourceType).toBe('WORK_ACT');
    });
  });

  // ─── settle notification test ─────────
  describe('settle notifications', () => {
    it('should create notifications for both parties', async () => {
      prisma.dispute.findUnique.mockResolvedValue(mockDispute);
      prisma.dispute.update.mockResolvedValue({ ...mockDispute, status: 'SETTLED' });
      await service.settle('disp-1', 'Agreed');
      // Should create 2 notifications (one for partyA, one for partyB)
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });

  // ─── listDisputes with status filter ──
  describe('listDisputes with filters', () => {
    it('should filter by status', async () => {
      prisma.dispute.findMany.mockResolvedValue([]);
      prisma.dispute.count.mockResolvedValue(0);
      const result = await service.listDisputes('a1', 'OPENED' as any);
      expect(result.total).toBe(0);
    });

    it('should handle pagination page 2', async () => {
      prisma.dispute.findMany.mockResolvedValue([]);
      prisma.dispute.count.mockResolvedValue(25);
      const result = await service.listDisputes('a1', undefined, 2, 20);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(2);
    });
  });
});
