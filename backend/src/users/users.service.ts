import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findBySeatId(seatId: string) {
    return this.prisma.user.findUnique({
      where: { seatId },
      include: {
        khuralSeats: {
          include: {
            group: true,
          },
        },
        guildMemberships: {
          include: {
            guild: true,
          },
        },
        altanLedger: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
