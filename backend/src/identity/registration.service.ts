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

    // 1. Find or create the target TUMEN (10,000) for this district
    let tumen: any = await this.prisma.khuralGroup.findFirst({
      where: {
        level: KhuralLevel.TUMEN,
        name: { contains: districtName },
      },
      include: { childGroups: true },
    });

    if (!tumen) {
      tumen = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.TUMEN,
          name: `${districtName} Tumen I`,
        },
        include: { childGroups: true },
      });
    }

    // 2. Find available MYANGAN (1,000)
    let myangan: any = await this.findAvailableChild(tumen.id, KhuralLevel.MYANGAN);
    if (!myangan) {
      myangan = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.MYANGAN,
          name: `${tumen.name} - Myangan ${tumen.childGroups.length + 1}`,
          parentGroupId: tumen.id,
        },
      });
    }

    // 3. Find available ZUUN (100)
    let zuun: any = await this.findAvailableChild(myangan.id, KhuralLevel.ZUUN);
    if (!zuun) {
      const zuunCount = await this.prisma.khuralGroup.count({ where: { parentGroupId: myangan.id } });
      zuun = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.ZUUN,
          name: `${myangan.name} - Zuun ${zuunCount + 1}`,
          parentGroupId: myangan.id,
        },
      });
    }

    // 4. Find available ARBAN (10)
    let arban: any = await this.findAvailableChild(zuun.id, KhuralLevel.ARBAN);
    if (!arban) {
      const arbanCount = await this.prisma.khuralGroup.count({ where: { parentGroupId: zuun.id } });
      arban = await this.prisma.khuralGroup.create({
        data: {
          level: KhuralLevel.ARBAN,
          name: `${zuun.name} - Arban ${arbanCount + 1}`,
          parentGroupId: zuun.id,
        },
      });
    }

    // 5. Assign to the first empty seat in the ARBAN
    const seats = await this.prisma.khuralSeat.findMany({
      where: { groupId: arban.id },
      orderBy: { index: 'asc' },
    });

    let seat = seats.find(s => !s.occupantUserId);
    
    if (!seat) {
        // If no seats initialized for this arban, create 10
        if (seats.length === 0) {
            for (let i = 0; i < 10; i++) {
                const s = await this.prisma.khuralSeat.create({
                    data: {
                        groupId: arban.id,
                        index: i,
                        isLeaderSeat: i === 0,
                    }
                });
                if (i === 0) seat = s;
            }
        } else {
             throw new BadRequestException('Arban full but logic failed to transition');
        }
    }

    await this.prisma.khuralSeat.update({
      where: { id: seat!.id },
      data: { occupantUserId: userId },
    });

    // Generate Hierarchical Seat ID (e.g. BRY-T01-M05-Z02-A01-S03)
    const tumenPrefix = tumen.name.substring(0, 3).toUpperCase();
    const hierarchicalSeatId = `${tumenPrefix}-T1-M${myangan.id.substring(0,2)}-Z${zuun.id.substring(0,2)}-A${arban.id.substring(0,2)}-S${seat!.index}`;

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

    return { tumen, myangan, zuun, arban, seatIndex: seat!.index, seatId: hierarchicalSeatId };
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
        if (level === KhuralLevel.ARBAN) {
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
