import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { BankRewardService } from '../bank/bank-reward.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private bankRewardService: BankRewardService,
  ) {}

  async createTask(dto: CreateTaskDto, createdByUserId: string) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        professionId: dto.professionId,
        rewardAltan: dto.rewardAltan,
        createdByUserId,
        postedByGuildId: dto.postedByGuildId,
        status: 'OPEN',
      },
      include: {
        profession: true,
        createdBy: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
        postedByGuild: true,
      },
    });
  }

  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        profession: true,
        createdBy: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
        postedByGuild: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async listTasks(status?: string, professionId?: string) {
    return this.prisma.task.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(professionId && { professionId }),
      },
      include: {
        profession: true,
        createdBy: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
        postedByGuild: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== 'OPEN') {
      throw new BadRequestException('Task is not available');
    }

    if (task.assignedUserId) {
      throw new BadRequestException('Task is already assigned');
    }

    // Verify user has the required profession
    if (task.professionId) {
      const guildMember = await this.prisma.guildMember.findFirst({
        where: {
          userId,
          guild: {
            professionId: task.professionId
          }
        }
      });

      if (!guildMember) {
        throw new BadRequestException('You do not belong to the required Guild/Profession for this task.');
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'TAKEN',
        assignedUserId: userId,
      },
      include: {
        profession: true,
        assignedUser: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
      },
    });
  }

  async completeTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.assignedUserId !== userId) {
      throw new ForbiddenException('Only assigned user can complete task');
    }

    if (task.status !== 'TAKEN') {
      throw new BadRequestException('Task is not in progress');
    }

    // 1. Transfer ALTAN reward via BankRewardService
    await this.bankRewardService.transferReward(
      task.createdByUserId,
      userId,
      task.rewardAltan.toNumber(),
      TransactionType.REWARD,
      `Task reward: ${task.title}`,
    );
    
    // 2. Grant Guild XP (Meritocracy)
    if (task.professionId) {
      await this.grantExperience(userId, task.professionId, 50); // Fixed 50 XP for MVP
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        profession: true,
        assignedUser: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
      },
    });
  }
  
  private async grantExperience(userId: string, professionId: string, amount: number) {
    const membership = await this.prisma.guildMember.findFirst({
      where: { userId, guild: { professionId } }
    });
    
    if (membership) {
      const newXp = membership.xp + amount;
      // Simple level up logic: Level N requires N * 100 XP
      // This is a naive MVP formula, can be refined later.
      const currentLevelCap = membership.level * 100;
      let newLevel = membership.level;
      
      if (newXp >= currentLevelCap) {
        newLevel += 1;
      }
      
      await this.prisma.guildMember.update({
        where: { id: membership.id },
        data: {
          xp: newXp,
          level: newLevel
        }
      });
    }
  }
}
