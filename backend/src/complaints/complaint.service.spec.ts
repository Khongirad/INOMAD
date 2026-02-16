import { Test, TestingModule } from '@nestjs/testing';
import { ComplaintService } from './complaint.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ComplaintService', () => {
  let service: ComplaintService;
  let prisma: any;

  const mockComplaint = {
    id: 'c1', filerId: 'filer-1', title: 'Test complaint', description: 'desc',
    status: 'FILED', currentLevel: 1, levelEntityId: null, deadline: new Date(),
    sourceType: 'CONTRACT', sourceId: 'src-1',
    filer: { id: 'filer-1', username: 'filer' },
    targetUser: null, assignee: null, dispute: null,
    responses: [], escalationHistory: [],
  };

  const mockPrisma = () => ({
    complaint: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(),
      update: jest.fn(), count: jest.fn(),
    },
    complaintResponse: { create: jest.fn() },
    escalationRecord: { create: jest.fn() },
    notification: { create: jest.fn().mockResolvedValue({}) },
    documentContract: { findUnique: jest.fn() },
    quest: { findUnique: jest.fn() },
    workAct: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(ComplaintService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── fileComplaint ─────────────────────
  describe('fileComplaint', () => {
    it('should file complaint with target user', async () => {
      prisma.documentContract.findUnique.mockResolvedValue({ id: 'src-1' });
      prisma.complaint.create.mockResolvedValue(mockComplaint);
      const result = await service.fileComplaint('filer-1', {
        sourceType: 'CONTRACT' as any, sourceId: 'src-1',
        category: 'FRAUD' as any, title: 'Test', description: 'desc',
        targetUserId: 'target-1',
      });
      expect(result.status).toBe('FILED');
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should throw if no target specified', async () => {
      await expect(service.fileComplaint('filer-1', {
        sourceType: 'CONTRACT' as any, sourceId: 'src-1',
        category: 'FRAUD' as any, title: 'T', description: 'd',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if source not found', async () => {
      prisma.documentContract.findUnique.mockResolvedValue(null);
      await expect(service.fileComplaint('filer-1', {
        sourceType: 'CONTRACT' as any, sourceId: 'bad',
        category: 'FRAUD' as any, title: 'T', description: 'd',
        targetUserId: 'u1',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getComplaint ──────────────────────
  describe('getComplaint', () => {
    it('should return complaint', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      const result = await service.getComplaint('c1');
      expect(result.id).toBe('c1');
    });

    it('should throw NotFoundException', async () => {
      prisma.complaint.findUnique.mockResolvedValue(null);
      await expect(service.getComplaint('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listComplaints ────────────────────
  describe('listComplaints', () => {
    it('should return paginated complaints', async () => {
      prisma.complaint.findMany.mockResolvedValue([mockComplaint]);
      prisma.complaint.count.mockResolvedValue(1);
      const result = await service.listComplaints({ status: 'FILED' as any });
      expect(result.total).toBe(1);
      expect(result.complaints).toHaveLength(1);
    });
  });

  // ─── respond ───────────────────────────
  describe('respond', () => {
    it('should create response and notify', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.complaintResponse.create.mockResolvedValue({ id: 'r1', responder: { id: 'u1' } });
      const result = await service.respond('c1', 'u1', 'Reply body', false);
      expect(result.id).toBe('r1');
    });

    it('should update status to RESPONDED on official response', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.complaintResponse.create.mockResolvedValue({ id: 'r1', responder: { id: 'u1' } });
      prisma.complaint.update.mockResolvedValue({});
      await service.respond('c1', 'u1', 'Official', true);
      expect(prisma.complaint.update).toHaveBeenCalled();
    });
  });

  // ─── assignReviewer ───────────────────
  describe('assignReviewer', () => {
    it('should assign reviewer and notify', async () => {
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, assigneeId: 'rev-1', status: 'UNDER_REVIEW' });
      const result = await service.assignReviewer('c1', 'rev-1');
      expect(result.status).toBe('UNDER_REVIEW');
    });
  });

  // ─── escalateToNextLevel ──────────────
  describe('escalateToNextLevel', () => {
    it('should escalate from level 1 to 2', async () => {
      prisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      prisma.escalationRecord.create.mockResolvedValue({});
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, currentLevel: 2, status: 'ESCALATED_L2' });
      const result = await service.escalateToNextLevel('c1', 'u1', 'Not resolved');
      expect(result.currentLevel).toBe(2);
    });

    it('should throw if already at level 7 (court)', async () => {
      prisma.complaint.findUnique.mockResolvedValue({ ...mockComplaint, currentLevel: 7 });
      await expect(service.escalateToNextLevel('c1', 'u1', 'reason'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if already resolved', async () => {
      prisma.complaint.findUnique.mockResolvedValue({ ...mockComplaint, status: 'RESOLVED' });
      await expect(service.escalateToNextLevel('c1', 'u1', 'reason'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── resolve ──────────────────────────
  describe('resolve', () => {
    it('should resolve complaint and notify', async () => {
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, status: 'RESOLVED', filerId: 'filer-1' });
      const result = await service.resolve('c1', 'Resolved');
      expect(result.status).toBe('RESOLVED');
    });
  });

  // ─── dismiss ──────────────────────────
  describe('dismiss', () => {
    it('should dismiss complaint', async () => {
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, status: 'DISMISSED' });
      const result = await service.dismiss('c1', 'Invalid');
      expect(result.status).toBe('DISMISSED');
    });
  });

  // ─── getStats ─────────────────────────
  describe('getStats', () => {
    it('should return stats with level breakdown', async () => {
      prisma.complaint.count.mockResolvedValue(10);
      const result = await service.getStats();
      expect(result.total).toBe(10);
      expect(result.byLevel).toHaveLength(7);
    });
  });

  // ─── getComplaintBook ─────────────────
  describe('getComplaintBook', () => {
    it('should return complaints for a level', async () => {
      prisma.complaint.findMany.mockResolvedValue([mockComplaint]);
      prisma.complaint.count.mockResolvedValue(1);
      const result = await service.getComplaintBook(1);
      expect(result.level).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  // ─── autoEscalateOverdue ──────────────
  describe('autoEscalateOverdue', () => {
    it('should auto-escalate overdue complaints', async () => {
      prisma.complaint.findMany.mockResolvedValue([
        { ...mockComplaint, currentLevel: 2, filerId: 'filer-1', title: 'Late' },
      ]);
      prisma.escalationRecord.create.mockResolvedValue({});
      prisma.complaint.update.mockResolvedValue({});
      const result = await service.autoEscalateOverdue();
      expect(result.escalated).toBe(1);
    });

    it('should return 0 when no overdue', async () => {
      prisma.complaint.findMany.mockResolvedValue([]);
      const result = await service.autoEscalateOverdue();
      expect(result.escalated).toBe(0);
    });
  });

  // ─── dismiss ──────────────────────────
  describe('dismiss', () => {
    it('should dismiss complaint with reason', async () => {
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, status: 'DISMISSED' });
      const result = await service.dismiss('c1', 'no merit');
      expect(result.status).toBe('DISMISSED');
    });
  });

  // ─── getComplaint edge cases ──────────
  describe('getComplaint edge cases', () => {
    it('should throw NotFoundException when complaint not found', async () => {
      prisma.complaint.findUnique.mockResolvedValue(null);
      await expect(service.getComplaint('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── escalateToNextLevel edge cases ───
  describe('escalateToNextLevel edge cases', () => {
    it('should escalate to court when at level 6', async () => {
      prisma.complaint.findUnique.mockResolvedValue({ ...mockComplaint, currentLevel: 6 });
      prisma.escalationRecord.create.mockResolvedValue({});
      prisma.complaint.update.mockResolvedValue({ ...mockComplaint, currentLevel: 7, status: 'IN_COURT' });
      const result = await service.escalateToNextLevel('c1', 'u1', 'final escalation');
      expect(result.currentLevel).toBe(7);
    });
  });

  // ─── respond edge cases ───────────────
  describe('respond edge cases', () => {
    it('should throw if complaint not found', async () => {
      prisma.complaint.findUnique.mockResolvedValue(null);
      await expect(service.respond('bad', 'u1', 'body'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
