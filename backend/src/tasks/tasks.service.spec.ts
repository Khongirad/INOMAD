import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;
  let bankRewardService: any;

  beforeEach(async () => {
    prisma = {
      task: {
        create: jest.fn().mockResolvedValue({ id: 'task-1', status: 'OPEN' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      guildMember: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    bankRewardService = {
      transferReward: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: BankRewardService, useValue: bankRewardService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('createTask', () => {
    it('should create task', async () => {
      const result = await service.createTask({
        title: 'Build widget', description: 'Build a widget',
        professionId: 'prof-1', rewardAltan: 100,
      } as any, 'u1');
      expect(result.id).toBe('task-1');
    });
  });

  describe('getTask', () => {
    it('should throw NotFoundException for missing task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.getTask('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return task with relations', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', title: 'Build widget' });
      const result = await service.getTask('task-1');
      expect(result.title).toBe('Build widget');
    });
  });

  describe('listTasks', () => {
    it('should list tasks with filters', async () => {
      await service.listTasks('OPEN', 'prof-1');
      expect(prisma.task.findMany).toHaveBeenCalled();
    });
  });

  describe('acceptTask', () => {
    it('should throw NotFoundException for missing task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.acceptTask('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if task not OPEN', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'TAKEN' });
      await expect(service.acceptTask('task-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already assigned', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'OPEN', assignedUserId: 'u2' });
      await expect(service.acceptTask('task-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user lacks required profession', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'OPEN', assignedUserId: null, professionId: 'prof-1' });
      prisma.guildMember.findFirst.mockResolvedValue(null);
      await expect(service.acceptTask('task-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should accept task when user has profession', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'OPEN', assignedUserId: null, professionId: 'prof-1' });
      prisma.guildMember.findFirst.mockResolvedValue({ id: 'gm-1' });
      prisma.task.update.mockResolvedValue({ id: 'task-1', status: 'TAKEN', assignedUserId: 'u1' });
      const result = await service.acceptTask('task-1', 'u1');
      expect(result.status).toBe('TAKEN');
    });
  });

  describe('completeTask', () => {
    it('should throw NotFoundException for missing task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.completeTask('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-assigned user', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', assignedUserId: 'u2', status: 'TAKEN' });
      await expect(service.completeTask('task-1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if task not TAKEN', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', assignedUserId: 'u1', status: 'OPEN' });
      await expect(service.completeTask('task-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should complete task and transfer reward', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 'task-1', assignedUserId: 'u1', status: 'TAKEN',
        createdByUserId: 'u2', rewardAltan: { toNumber: () => 100 },
        title: 'Widget', professionId: 'prof-1',
      });
      prisma.guildMember.findFirst.mockResolvedValue({ id: 'gm-1', xp: 50, level: 1 });
      prisma.task.update.mockResolvedValue({ id: 'task-1', status: 'COMPLETED' });
      const result = await service.completeTask('task-1', 'u1');
      expect(result.status).toBe('COMPLETED');
      expect(bankRewardService.transferReward).toHaveBeenCalled();
    });
  });
});
