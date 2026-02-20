import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

  /**
   * Get full user profile with all relations needed for dashboard display.
   */
  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        khuralSeats: {
          include: { group: true },
        },
        guildMemberships: {
          include: { guild: true },
        },
        altanLedger: true,
        onboardingProgress: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Strip sensitive fields
    const { passwordHash, ...profile } = user;
    return profile;
  }

  /**
   * Update user demographic/census data.
   * Only provided fields are updated (partial update).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};

    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.ethnicity !== undefined) data.ethnicity = dto.ethnicity;
    if (dto.birthPlace !== undefined) data.birthPlace = dto.birthPlace;
    if (dto.clan !== undefined) data.clan = dto.clan;
    if (dto.nationality !== undefined) data.nationality = dto.nationality;
    if (dto.currentAddress !== undefined) data.currentAddress = dto.currentAddress;
    if (dto.language !== undefined) data.language = dto.language;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    const { passwordHash, ...profile } = updated;
    return profile;
  }
}
