import { Test, TestingModule } from '@nestjs/testing';
import { OrgQuestService } from './org-quest.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegionalReputationService } from '../regional-reputation/regional-reputation.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OrgQuestService', () => {
  let service: OrgQuestService;
  let prisma: any;

  const mockOrg = { id: 'org-1', name: 'Test Org', leaderId: 'leader-1' };
  const mockTask = {
    id: 'task-1', organizationId: 'org-1', creatorId: 'creator-1', assigneeId: null,
    title: 'Task 1', description: 'Desc', category: 'GENERAL', status: 'OPEN',
    visibility: 'ORG_ONLY', objectives: [], progress: 0, reputationGain: 50,
    republicId: 'rep-1', rewardAltan: 100,
    organization: { id: 'org-1', name: 'Test Org' },
    creator: { id: 'creator-1', username: 'creator' },
    assignee: null,
  };

  const mockPrisma = () => ({
    organization: { findUnique: jest.fn() },
    organizationMember: { findUnique: jest.fn(), findMany: jest.fn() },
    orgPermission: { findUnique: jest.fn() },
    orgQuest: {
      create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(),
      count: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
    },
    tumen: { findFirst: jest.fn() },
    $transaction: jest.fn((args) => Promise.all(args)),
  });

  const mockReputation = () => ({
    awardPoints: jest.fn().mockResolvedValue({}),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgQuestService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: RegionalReputationService, useFactory: mockReputation },
      ],
    }).compile();
    service = module.get(OrgQuestService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createTask ────────────────────────
  describe('createTask', () => {
    it('should create a task with valid permissions', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canCreateTasks: true });
      prisma.tumen.findFirst.mockResolvedValue({ republicId: 'rep-1' });
      prisma.orgQuest.create.mockResolvedValue(mockTask);
      const result = await service.createTask('org-1', 'creator-1', {
        title: 'Task', description: 'Desc', objectives: [{ description: 'Go' }], category: 'GENERAL',
      });
      expect(result.title).toBe('Task 1');
    });
    it('should throw NotFoundException for missing org', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.createTask('org-bad', 'u1', { title: 'T', description: 'D', objectives: [], category: 'C' })).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException if not a member', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.createTask('org-1', 'u1', { title: 'T', description: 'D', objectives: [], category: 'C' })).rejects.toThrow(ForbiddenException);
    });
    it('should throw ForbiddenException if no canCreateTasks permission', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      prisma.organizationMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
      prisma.orgPermission.findUnique.mockResolvedValue({ canCreateTasks: false });
      await expect(service.createTask('org-1', 'u1', { title: 'T', description: 'D', objectives: [], category: 'C' })).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getOrgTaskBoard ───────────────────
  describe('getOrgTaskBoard', () => {
    it('should return paginated task board', async () => {
      prisma.orgQuest.findMany.mockResolvedValue([mockTask]);
      prisma.orgQuest.count.mockResolvedValue(1);
      const result = await service.getOrgTaskBoard('org-1');
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
    it('should apply category and status filters', async () => {
      prisma.orgQuest.findMany.mockResolvedValue([]);
      prisma.orgQuest.count.mockResolvedValue(0);
      await service.getOrgTaskBoard('org-1', 'u1', { category: 'GENERAL', status: 'OPEN' });
      expect(prisma.orgQuest.findMany).toHaveBeenCalled();
    });
  });

  // ─── browseAvailableTasks ──────────────
  describe('browseAvailableTasks', () => {
    it('should return public + user org tasks', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'org-1' }]);
      prisma.orgQuest.findMany.mockResolvedValue([mockTask]);
      prisma.orgQuest.count.mockResolvedValue(1);
      const result = await service.browseAvailableTasks('user-1');
      expect(result.data).toHaveLength(1);
    });
    it('should apply search filter', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([]);
      prisma.orgQuest.findMany.mockResolvedValue([]);
      prisma.orgQuest.count.mockResolvedValue(0);
      await service.browseAvailableTasks('user-1', { search: 'test' });
      expect(prisma.orgQuest.findMany).toHaveBeenCalled();
    });
    it('should apply powerBranch filter', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([]);
      prisma.orgQuest.findMany.mockResolvedValue([]);
      prisma.orgQuest.count.mockResolvedValue(0);
      await service.browseAvailableTasks('user-1', { powerBranch: 'EXECUTIVE' });
      expect(prisma.orgQuest.findMany).toHaveBeenCalled();
    });
  });

  // ─── acceptTask ────────────────────────
  describe('acceptTask', () => {
    it('should accept an open task', async () => {
      // First findUnique call: pre-check visibility (return PUBLIC to skip membership check)
      // Second findUnique call: return the accepted task
      prisma.orgQuest.findUnique
        .mockResolvedValueOnce({ ...mockTask, visibility: 'PUBLIC', organization: mockOrg })
        .mockResolvedValueOnce({ ...mockTask, status: 'ACCEPTED', assigneeId: 'user-2' });
      prisma.orgQuest.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.acceptTask('task-1', 'user-2');
      expect(result?.status).toBe('ACCEPTED');
    });
    it('should throw NotFoundException for missing task', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue(null);
      await expect(service.acceptTask('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException for ORG_ONLY task when not member', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, visibility: 'ORG_ONLY', organization: mockOrg });
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.acceptTask('task-1', 'non-member')).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if creator tries to accept', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, visibility: 'PUBLIC', organization: mockOrg });
      prisma.orgQuest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.acceptTask('task-1', 'creator-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateProgress ────────────────────
  describe('updateProgress', () => {
    it('should update progress', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'user-2', status: 'ACCEPTED' });
      prisma.orgQuest.update.mockResolvedValue({ progress: 50 });
      const result = await service.updateProgress('task-1', 'user-2', [
        { description: 'A', completed: true },
        { description: 'B', completed: false },
      ]);
      expect(result.progress).toBe(50);
    });
    it('should throw ForbiddenException if not assignee', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'other' });
      await expect(service.updateProgress('task-1', 'user-2', [])).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not in progress status', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'user-2', status: 'COMPLETED' });
      await expect(service.updateProgress('task-1', 'user-2', [])).rejects.toThrow(BadRequestException);
    });
  });

  // ─── submitTask ────────────────────────
  describe('submitTask', () => {
    it('should submit task with evidence', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'user-2', status: 'IN_PROGRESS' });
      prisma.orgQuest.update.mockResolvedValue({ status: 'SUBMITTED' });
      const result = await service.submitTask('task-1', 'user-2', [{ url: 'proof.jpg' }]);
      expect(result.status).toBe('SUBMITTED');
    });
    it('should throw ForbiddenException if not assignee', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, assigneeId: 'other' });
      await expect(service.submitTask('task-1', 'user-2', [])).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── approveTask ───────────────────────
  describe('approveTask', () => {
    it('should approve task and award reputation', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({
        ...mockTask, creatorId: 'creator-1', assigneeId: 'user-2', status: 'SUBMITTED',
      });
      prisma.orgQuest.update.mockResolvedValue({ ...mockTask, status: 'COMPLETED' });
      const result = await service.approveTask('task-1', 'creator-1', 5, 'Great');
      expect(result.status).toBe('COMPLETED');
    });
    it('should throw ForbiddenException if not creator', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, creatorId: 'other', status: 'SUBMITTED' });
      await expect(service.approveTask('task-1', 'user-2', 5)).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not SUBMITTED', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, creatorId: 'creator-1', status: 'OPEN' });
      await expect(service.approveTask('task-1', 'creator-1', 5)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── rejectTask ────────────────────────
  describe('rejectTask', () => {
    it('should reject submitted task', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, creatorId: 'creator-1', status: 'SUBMITTED' });
      prisma.orgQuest.update.mockResolvedValue({ ...mockTask, status: 'REJECTED' });
      const result = await service.rejectTask('task-1', 'creator-1', 'Not good');
      expect(result.status).toBe('REJECTED');
    });
    it('should throw ForbiddenException if not creator', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, creatorId: 'other', status: 'SUBMITTED' });
      await expect(service.rejectTask('task-1', 'user-2', 'Bad')).rejects.toThrow(ForbiddenException);
    });
    it('should throw BadRequestException if not SUBMITTED', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue({ ...mockTask, creatorId: 'creator-1', status: 'OPEN' });
      await expect(service.rejectTask('task-1', 'creator-1', 'Bad')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getMyTasks ────────────────────────
  describe('getMyTasks', () => {
    it('should return tasks as creator', async () => {
      prisma.orgQuest.findMany.mockResolvedValue([mockTask]);
      const result = await service.getMyTasks('creator-1', 'creator');
      expect(result).toHaveLength(1);
    });
    it('should return tasks as assignee', async () => {
      prisma.orgQuest.findMany.mockResolvedValue([]);
      await service.getMyTasks('user-2', 'assignee');
      expect(prisma.orgQuest.findMany).toHaveBeenCalled();
    });
    it('should return all tasks by default', async () => {
      prisma.orgQuest.findMany.mockResolvedValue([]);
      await service.getMyTasks('user-1');
      expect(prisma.orgQuest.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }));
    });
  });

  // ─── getTask ───────────────────────────
  describe('getTask', () => {
    it('should return task when found', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue(mockTask);
      expect(await service.getTask('task-1')).toEqual(mockTask);
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.orgQuest.findUnique.mockResolvedValue(null);
      await expect(service.getTask('bad')).rejects.toThrow(NotFoundException);
    });
  });
});
