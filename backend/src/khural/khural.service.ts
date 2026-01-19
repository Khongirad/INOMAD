import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKhuralGroupDto } from './dto/khural.dto';

@Injectable()
export class KhuralService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new Khural group with exactly 10 empty seats
   */
  async createGroup(dto: CreateKhuralGroupDto) {
    // Create group with 10 seats
    const group = await this.prisma.khuralGroup.create({
      data: {
        level: dto.level,
        name: dto.name,
        parentGroupId: dto.parentGroupId,
        seats: {
          create: Array.from({ length: 10 }, (_, i) => ({
            index: i,
            isLeaderSeat: i === 0, // First seat is leader seat
          })),
        },
      },
      include: {
        seats: {
          orderBy: { index: 'asc' },
          include: {
            occupant: true,
          },
        },
      },
    });

    return group;
  }

  /**
   * Get group with seats in circle-ready format
   */
  async getGroup(groupId: string) {
    const group = await this.prisma.khuralGroup.findUnique({
      where: { id: groupId },
      include: {
        seats: {
          orderBy: { index: 'asc' },
          include: {
            occupant: {
              select: {
                id: true,
                seatId: true,
                role: true,
                guildMemberships: {
                  include: {
                    guild: {
                      include: {
                        profession: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        parentGroup: true,
        childGroups: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Khural group not found');
    }

    return group;
  }

  /**
   * Apply for an empty seat
   */
  async applySeat(groupId: string, seatIndex: number, userId: string) {
    // Find the seat
    const seat = await this.prisma.khuralSeat.findFirst({
      where: {
        groupId,
        index: seatIndex,
      },
    });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    if (seat.occupantUserId) {
      throw new BadRequestException('Seat is already occupied');
    }

    // Check if user already has a seat in this group
    const existingSeat = await this.prisma.khuralSeat.findFirst({
      where: {
        groupId,
        occupantUserId: userId,
      },
    });

    if (existingSeat) {
      throw new BadRequestException('User already has a seat in this group');
    }

    // Assign seat
    const updatedSeat = await this.prisma.khuralSeat.update({
      where: { id: seat.id },
      data: { occupantUserId: userId },
      include: {
        occupant: true,
        group: true,
      },
    });

    return updatedSeat;
  }

  /**
   * Assign seat (leader action)
   */
  async assignSeat(
    groupId: string,
    seatIndex: number,
    targetUserId: string,
    requestingUserId: string,
  ) {
    // Check if requesting user is a leader in this group
    const leaderSeat = await this.prisma.khuralSeat.findFirst({
      where: {
        groupId,
        occupantUserId: requestingUserId,
        isLeaderSeat: true,
      },
    });

    if (!leaderSeat) {
      throw new ForbiddenException('Only group leader can assign seats');
    }

    // Find the seat
    const seat = await this.prisma.khuralSeat.findFirst({
      where: {
        groupId,
        index: seatIndex,
      },
    });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    if (seat.occupantUserId) {
      throw new BadRequestException('Seat is already occupied');
    }

    // Assign seat
    const updatedSeat = await this.prisma.khuralSeat.update({
      where: { id: seat.id },
      data: { occupantUserId: targetUserId },
      include: {
        occupant: true,
        group: true,
      },
    });

    return updatedSeat;
  }

  /**
   * List all groups by level
   */
  async listGroups(level?: string) {
    return this.prisma.khuralGroup.findMany({
      where: level ? { level: level as any } : undefined,
      include: {
        seats: {
          orderBy: { index: 'asc' },
          include: {
            occupant: {
              select: {
                id: true,
                seatId: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }
}
