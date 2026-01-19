import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { AltanService } from '../altan/altan.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private altanService: AltanService,
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

    // TODO: Check if user has required profession

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

    // Transfer ALTAN reward
    await this.altanService.transferReward(
      task.createdByUserId,
      userId,
      task.rewardAltan.toNumber(),
    );

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
}
