import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HierarchyService — manages the Arban→Zun→Myangan→Tumen hierarchy.
 *
 * Arban levels:
 *   lvl 1 = standalone Arban (10 people)
 *   lvl 2 = Arban in a Zun (manages 100)
 *   lvl 3 = Arban in a Myangan (manages 1000)
 *   lvl 4 = Arban in a Tumen (manages 10000)
 *
 * Tumen is the MAXIMUM unit — Tumens cooperate but NEVER merge.
 */
@Injectable()
export class HierarchyService {
  private readonly logger = new Logger(HierarchyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // FULL TREE
  // ────────────────────────────────────

  async getHierarchyTree() {
    const republics = await this.prisma.republicanKhural.findMany({
      where: { isActive: true },
      include: {
        memberTumens: {
          where: { isActive: true },
          include: {
            memberMyangans: {
              where: { isActive: true },
              include: {
                memberZuns: {
                  where: { isActive: true },
                  include: {
                    memberArbans: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Also get confederation
    const confederation = await this.prisma.confederativeKhural.findFirst({
      where: { isActive: true },
      include: {
        memberRepublics: {
          select: { id: true, name: true, republicKey: true, totalMembers: true },
        },
      },
    });

    return { confederation, republics };
  }

  // ────────────────────────────────────
  // ZUN MANAGEMENT (lvl 2: 10 Arbans = 100)
  // ────────────────────────────────────

  async listZuns(myanganId?: string) {
    const where: any = { isActive: true };
    if (myanganId) where.myanganId = myanganId;

    return this.prisma.zun.findMany({
      where,
      include: {
        memberArbans: true,
        myangan: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getZun(zunId: string) {
    const zun = await this.prisma.zun.findUnique({
      where: { id: zunId },
      include: {
        memberArbans: true,
        myangan: { select: { id: true, name: true } },
      },
    });
    if (!zun) throw new NotFoundException('Цзун не найден');
    return zun;
  }

  async joinZun(arbanId: bigint, zunId: string) {
    const zun = await this.prisma.zun.findUnique({
      where: { id: zunId },
      include: { memberArbans: true },
    });
    if (!zun) throw new NotFoundException('Цзун не найден');

    // Enforce max 10 Arbans per Zun
    if (zun.memberArbans.length >= 10) {
      throw new BadRequestException('Цзун уже полон (макс. 10 Арбанов)');
    }

    // Check if Arban already belongs to a Zun
    const arban = await this.prisma.familyArban.findUnique({
      where: { arbanId },
    });
    if (!arban) throw new NotFoundException('Арбан не найден');
    if (arban.zunId) {
      throw new BadRequestException('Арбан уже состоит в другом Цзуне');
    }

    const updated = await this.prisma.familyArban.update({
      where: { arbanId },
      data: { zunId: zun.zunId },
    });

    this.logger.log(`Arban ${arbanId} joined Zun ${zunId} (lvl 1→2)`);
    return updated;
  }

  async leaveZun(arbanId: bigint) {
    const arban = await this.prisma.familyArban.findUnique({
      where: { arbanId },
    });
    if (!arban) throw new NotFoundException('Арбан не найден');
    if (!arban.zunId) {
      throw new BadRequestException('Арбан не состоит ни в каком Цзуне');
    }

    const updated = await this.prisma.familyArban.update({
      where: { arbanId },
      data: { zunId: null },
    });

    this.logger.log(`Arban ${arbanId} left Zun (lvl 2→1)`);
    return updated;
  }

  // ────────────────────────────────────
  // MYANGAN MANAGEMENT (lvl 3: 10 Zuns = 1000)
  // ────────────────────────────────────

  async listMyangans(tumenId?: string) {
    const where: any = { isActive: true };
    if (tumenId) where.tumenId = tumenId;

    return this.prisma.myangan.findMany({
      where,
      include: {
        memberZuns: { include: { _count: { select: { memberArbans: true } } } },
        tumen: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyangan(id: string) {
    const myangan = await this.prisma.myangan.findUnique({
      where: { id },
      include: {
        memberZuns: {
          include: { memberArbans: true },
        },
        tumen: { select: { id: true, name: true } },
      },
    });
    if (!myangan) throw new NotFoundException('Мянган не найден');
    return myangan;
  }

  async joinMyangan(zunId: string, myanganId: string) {
    const myangan = await this.prisma.myangan.findUnique({
      where: { id: myanganId },
      include: { memberZuns: true },
    });
    if (!myangan) throw new NotFoundException('Мянган не найден');

    // Enforce max 10 Zuns per Myangan
    if (myangan.memberZuns.length >= 10) {
      throw new BadRequestException('Мянган уже полон (макс. 10 Цзунов)');
    }

    // Check Zun exists and isn't already in a Myangan
    const zun = await this.prisma.zun.findUnique({ where: { id: zunId } });
    if (!zun) throw new NotFoundException('Цзун не найден');
    if (zun.myanganId) {
      throw new BadRequestException('Цзун уже состоит в другом Мянгане');
    }

    const updated = await this.prisma.zun.update({
      where: { id: zunId },
      data: { myanganId },
    });

    // Recalculate Myangan stats
    await this.recalcMyanganStats(myanganId);
    this.logger.log(`Zun ${zunId} joined Myangan ${myanganId} (lvl 2→3)`);
    return updated;
  }

  // ────────────────────────────────────
  // TUMEN MANAGEMENT (lvl 4: 10 Myangans = 10000)
  // ────────────────────────────────────

  async listTumens(republicId?: string) {
    const where: any = { isActive: true };
    if (republicId) where.republicId = republicId;

    return this.prisma.tumen.findMany({
      where,
      include: {
        memberMyangans: {
          include: { _count: { select: { memberZuns: true } } },
        },
        republic: { select: { id: true, name: true } },
        cooperationsAsA: { where: { status: 'ACTIVE' }, include: { tumenB: { select: { id: true, name: true } } } },
        cooperationsAsB: { where: { status: 'ACTIVE' }, include: { tumenA: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTumen(id: string) {
    const tumen = await this.prisma.tumen.findUnique({
      where: { id },
      include: {
        memberMyangans: {
          include: {
            memberZuns: {
              include: { _count: { select: { memberArbans: true } } },
            },
          },
        },
        republic: { select: { id: true, name: true } },
        cooperationsAsA: { include: { tumenB: { select: { id: true, name: true } } } },
        cooperationsAsB: { include: { tumenA: { select: { id: true, name: true } } } },
      },
    });
    if (!tumen) throw new NotFoundException('Тумэн не найден');
    return tumen;
  }

  async joinTumen(myanganId: string, tumenId: string) {
    const tumen = await this.prisma.tumen.findUnique({
      where: { id: tumenId },
      include: { memberMyangans: true },
    });
    if (!tumen) throw new NotFoundException('Тумэн не найден');

    // Enforce max 10 Myangans per Tumen
    if (tumen.memberMyangans.length >= 10) {
      throw new BadRequestException('Тумэн уже полон (макс. 10 Мянганов)');
    }

    const myangan = await this.prisma.myangan.findUnique({ where: { id: myanganId } });
    if (!myangan) throw new NotFoundException('Мянган не найден');
    if (myangan.tumenId) {
      throw new BadRequestException('Мянган уже состоит в другом Тумэне');
    }

    const updated = await this.prisma.myangan.update({
      where: { id: myanganId },
      data: { tumenId },
    });

    // Recalculate Tumen stats
    await this.recalcTumenStats(tumenId);
    this.logger.log(`Myangan ${myanganId} joined Tumen ${tumenId} (lvl 3→4)`);
    return updated;
  }

  // ────────────────────────────────────
  // STATISTICS RECALCULATION
  // ────────────────────────────────────

  private async recalcMyanganStats(myanganId: string) {
    const myangan = await this.prisma.myangan.findUnique({
      where: { id: myanganId },
      include: {
        memberZuns: { include: { memberArbans: true } },
      },
    });
    if (!myangan) return;

    const totalArbans = myangan.memberZuns.reduce(
      (acc, zun) => acc + zun.memberArbans.length,
      0,
    );
    const totalMembers = totalArbans * 10; // Each Arban = 10 people

    await this.prisma.myangan.update({
      where: { id: myanganId },
      data: { totalArbans, totalMembers },
    });
  }

  private async recalcTumenStats(tumenId: string) {
    const tumen = await this.prisma.tumen.findUnique({
      where: { id: tumenId },
      include: {
        memberMyangans: {
          include: { memberZuns: { include: { memberArbans: true } } },
        },
      },
    });
    if (!tumen) return;

    let totalArbans = 0;
    for (const myangan of tumen.memberMyangans) {
      for (const zun of myangan.memberZuns) {
        totalArbans += zun.memberArbans.length;
      }
    }
    const totalMembers = totalArbans * 10;

    await this.prisma.tumen.update({
      where: { id: tumenId },
      data: { totalArbans, totalMembers },
    });
  }

  // ────────────────────────────────────
  // TUMEN COOPERATION (not merger!)
  // ────────────────────────────────────

  async proposeCooperation(
    tumenId: string,
    targetTumenId: string,
    userId: string,
    data: { title: string; description?: string; treaty?: string },
  ) {
    // Verify proposer is Tumen leader
    const tumen = await this.prisma.tumen.findUnique({ where: { id: tumenId } });
    if (!tumen) throw new NotFoundException('Тумэн не найден');
    if (tumen.leaderUserId !== userId) {
      throw new BadRequestException('Только лидер Тумэна может предложить сотрудничество');
    }

    const targetTumen = await this.prisma.tumen.findUnique({ where: { id: targetTumenId } });
    if (!targetTumen) throw new NotFoundException('Целевой Тумэн не найден');

    // Check for existing cooperation
    const existing = await this.prisma.tumenCooperation.findFirst({
      where: {
        OR: [
          { tumenAId: tumenId, tumenBId: targetTumenId },
          { tumenAId: targetTumenId, tumenBId: tumenId },
        ],
        status: { in: ['PROPOSED', 'ACTIVE'] },
      },
    });
    if (existing) {
      throw new BadRequestException('Сотрудничество или предложение уже существует');
    }

    const cooperation = await this.prisma.tumenCooperation.create({
      data: {
        tumenAId: tumenId,
        tumenBId: targetTumenId,
        title: data.title,
        description: data.description,
        treaty: data.treaty,
        proposedById: userId,
        status: 'PROPOSED',
      },
    });

    // Notify target Tumen leader
    if (targetTumen.leaderUserId) {
      await this.prisma.notification.create({
        data: {
          userId: targetTumen.leaderUserId,
          type: 'NEW_MESSAGE',
          title: 'Предложение о сотрудничестве',
          body: `Тумэн "${tumen.name}" предлагает сотрудничество: ${data.title}`,
          linkUrl: `/hierarchy/tumens/${targetTumenId}`,
        },
      });
    }

    this.logger.log(`Cooperation proposed: ${tumenId} → ${targetTumenId}`);
    return cooperation;
  }

  async respondToCooperation(cooperationId: string, userId: string, accept: boolean) {
    const coop = await this.prisma.tumenCooperation.findUnique({
      where: { id: cooperationId },
      include: {
        tumenA: true,
        tumenB: true,
      },
    });
    if (!coop) throw new NotFoundException('Предложение не найдено');
    if (coop.status !== 'PROPOSED') {
      throw new BadRequestException('Предложение уже обработано');
    }

    // Only target Tumen leader can respond
    if (coop.tumenB.leaderUserId !== userId) {
      throw new BadRequestException('Только лидер целевого Тумэна может ответить');
    }

    if (accept) {
      const updated = await this.prisma.tumenCooperation.update({
        where: { id: cooperationId },
        data: { status: 'ACTIVE', signedAt: new Date() },
      });
      this.logger.log(`Cooperation accepted: ${coop.tumenAId} ↔ ${coop.tumenBId}`);
      return updated;
    } else {
      const updated = await this.prisma.tumenCooperation.update({
        where: { id: cooperationId },
        data: { status: 'DISSOLVED' },
      });
      this.logger.log(`Cooperation rejected: ${coop.tumenAId} ↗ ${coop.tumenBId}`);
      return updated;
    }
  }

  async dissolveCooperation(cooperationId: string, userId: string) {
    const coop = await this.prisma.tumenCooperation.findUnique({
      where: { id: cooperationId },
      include: { tumenA: true, tumenB: true },
    });
    if (!coop) throw new NotFoundException('Сотрудничество не найдено');
    if (coop.status !== 'ACTIVE') {
      throw new BadRequestException('Сотрудничество не активно');
    }

    // Either Tumen leader can dissolve
    if (coop.tumenA.leaderUserId !== userId && coop.tumenB.leaderUserId !== userId) {
      throw new BadRequestException('Только лидер одного из Тумэнов может расторгнуть');
    }

    const updated = await this.prisma.tumenCooperation.update({
      where: { id: cooperationId },
      data: { status: 'DISSOLVED' },
    });

    this.logger.log(`Cooperation dissolved: ${coop.tumenAId} ↔ ${coop.tumenBId}`);
    return updated;
  }

  async listCooperations(tumenId: string) {
    return this.prisma.tumenCooperation.findMany({
      where: {
        OR: [{ tumenAId: tumenId }, { tumenBId: tumenId }],
      },
      include: {
        tumenA: { select: { id: true, name: true, region: true, totalMembers: true } },
        tumenB: { select: { id: true, name: true, region: true, totalMembers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
