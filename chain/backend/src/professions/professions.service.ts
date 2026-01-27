import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionDto } from './dto/professions.dto';

@Injectable()
export class ProfessionsService {
  constructor(private prisma: PrismaService) {}

  async createProfession(dto: CreateProfessionDto) {
    return this.prisma.profession.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async getProfession(id: string) {
    const profession = await this.prisma.profession.findUnique({
      where: { id },
      include: {
        guilds: {
          include: {
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
        },
        tasks: {
          where: {
            status: 'OPEN',
          },
        },
      },
    });

    if (!profession) {
      throw new NotFoundException('Profession not found');
    }

    return profession;
  }

  async listProfessions() {
    return this.prisma.profession.findMany({
      include: {
        guilds: true,
      },
    });
  }
}
