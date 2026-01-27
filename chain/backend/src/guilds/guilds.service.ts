import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuildDto } from './dto/guilds.dto';

@Injectable()
export class GuildsService {
  constructor(private prisma: PrismaService) {}

  async createGuild(dto: CreateGuildDto) {
    return this.prisma.guild.create({
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        professionId: dto.professionId,
      },
      include: {
        profession: true,
      },
    });
  }

  async getGuild(id: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id },
      include: {
        profession: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                seatId: true,
                role: true,
              },
            },
          },
        },
        tasks: {
          where: {
            status: 'OPEN',
          },
        },
      },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    return guild;
  }

  async listGuilds(type?: string) {
    return this.prisma.guild.findMany({
      where: type ? { type: type as any } : undefined,
      include: {
        profession: true,
        members: {
          include: {
            user: {
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

  async joinGuild(guildId: string, userId: string) {
    // Check if already a member
    const existing = await this.prisma.guildMember.findUnique({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already a member of this guild');
    }

    return this.prisma.guildMember.create({
      data: {
        guildId,
        userId,
        role: 'MEMBER',
      },
      include: {
        guild: true,
        user: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
      },
    });
  }

  async getGuildMembers(guildId: string) {
    return this.prisma.guildMember.findMany({
      where: { guildId },
      include: {
        user: {
          select: {
            id: true,
            seatId: true,
            role: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }
}
