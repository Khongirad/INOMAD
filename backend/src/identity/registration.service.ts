import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KhuralLevel, VerificationStatus, WalletStatus } from '@prisma/client';

@Injectable()
export class RegistrationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Assigns a user to a territorial seat based on the 10-100-1000-10000 rule.
   * Deterministically finds or creates groups to maintain the hierarchy.
   */
  async assignTerritory(userId: string, districtName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // 1. Find or create the target TUMED (10,000) for this district
    let tumed: any = await this.prisma.khuralGroup.findFirst({
      where: {
        level: KhuralLevel.TUMED,
        name: { contains: districtName },
      },
      include: { childGroups: true },
    });

    if (!tumed) {
      tumed = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.TUMED,
          name: `${districtName} Tumed I`,
        },
        include: { childGroups: true },
      });
    }

    // 2. Find available MYANGAD (1,000)
    let myangad: any = await this.findAvailableChild(tumed.id, KhuralLevel.MYANGAD);
    if (!myangad) {
      myangad = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.MYANGAD,
          name: `${tumed.name} - Myangad ${tumed.childGroups.length + 1}`,
          parentGroupId: tumed.id,
        },
      });
    }

    // 3. Find available ZUUN (100)
    let zuud: any = await this.findAvailableChild(myangad.id, KhuralLevel.ZUUN);
    if (!zuud) {
      const zuudCount = await this.prisma.khuralGroup.count({ where: { parentGroupId: myangad.id } });
      zuud = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.ZUUN,
          name: `${myangad.name} - Zuud ${zuudCount + 1}`,
          parentGroupId: myangad.id,
        },
      });
    }

    // 4. Find available ARBAD (10)
    let arbad: any = await this.findAvailableChild(zuud.id, KhuralLevel.ARBAD);
    if (!arbad) {
      const arbadCount = await this.prisma.khuralGroup.count({ where: { parentGroupId: zuud.id } });
      arbad = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.ARBAD,
          name: `${zuud.name} - Arbad ${arbadCount + 1}`,
          parentGroupId: zuud.id,
        },
      });
    }

    // 5. Assign to the first empty seat in the ARBAD
    const seats = await this.prisma.khuralSeat.findMany({
      where: { groupId: arbad.id },
      orderBy: { index: 'asc' },
    });

    let seat = seats.find(s => !s.occupantUserId);
    
    if (!seat) {
        // If no seats initialized for this arbad, create 10
        if (seats.length === 0) {
            for (let i = 0; i < 10; i++) {
                const s = await this.prisma.khuralSeat.create({
                    data: {
                        groupId: arbad.id,
                        index: i,
                        isLeaderSeat: i === 0,
                    }
                });
                if (i === 0) seat = s;
            }
        } else {
             throw new BadRequestException('Arbad full but logic failed to transition');
        }
    }

    await this.prisma.khuralSeat.update({
      where: { id: seat!.id },
      data: { occupantUserId: userId },
    });

    // Generate Hierarchical Seat ID (e.g. BRY-T01-M05-Z02-A01-S03)
    const tumedPrefix = tumed.name.substring(0, 3).toUpperCase();
    const hierarchicalSeatId = `${tumedPrefix}-T1-M${myangad.id.substring(0,2)}-Z${zuud.id.substring(0,2)}-A${arbad.id.substring(0,2)}-S${seat!.index}`;

    await this.prisma.user.update({
        where: { id: userId },
        data: { 
            seatId: hierarchicalSeatId,
            verificationStatus: VerificationStatus.PENDING,
            // We store the specific IDs in metadata or JSON if needed, 
            // but the KhuralSeat relation handles the hierarchy.
        }
    });

    // Create a "SeatSBT Draft" event in history
    await this.prisma.khuralEvent.create({
        data: {
            title: `SeatSBT Draft: ${hierarchicalSeatId}`,
            description: `A new citizen ritual has been initiated for seat ${hierarchicalSeatId}. Territorial bond pending social proof.`,
            type: 'APPOINTMENT',
            isVerified: false,
        }
    });

    return { tumed, myangad, zuud, arbad, seatIndex: seat!.index, seatId: hierarchicalSeatId };
  }

  private async findAvailableChild(parentId: string, level: KhuralLevel) {
    const groups = await this.prisma.khuralGroup.findMany({
        where: { parentGroupId: parentId, level },
        include: { 
            seats: true,
            childGroups: {
                include: { seats: true }
            }
        }
    });

    for (const group of groups) {
        if (level === KhuralLevel.ARBAD) {
            const occupiedSeats = await this.prisma.khuralSeat.count({
                where: { groupId: group.id, occupantUserId: { not: null } }
            });
            if (occupiedSeats < 10) return group;
        } else {
            // Need to check if children's children have space... 
            // Simplified for now: if it has fewer than 10 children, it has space.
            const childCount = await this.prisma.khuralGroup.count({
                where: { parentGroupId: group.id }
            });
            if (childCount < 10) return group;
        }
    }
    return null;
  }

  async initiateRegistration(data: any) {
    return this.prisma.user.create({
        data: {
            seatId: `TEMP-${Date.now()}`,
            role: 'CITIZEN',
            walletStatus: WalletStatus.LOCKED,
            verificationStatus: VerificationStatus.DRAFT,
            birthPlace: data.birthPlace,
            ethnicity: data.ethnicity,
            clan: data.clan,
        }
    });
  }

  async getUpdatedUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}
