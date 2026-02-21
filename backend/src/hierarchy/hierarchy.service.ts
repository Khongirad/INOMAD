import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HierarchyService — manages the Arbad→Zun→Myangad→Tumed hierarchy.
 *
 * Arbad levels:
 *   lvl 1 = standalone Arbad (10 people)
 *   lvl 2 = Arbad in a Zun (manages 100)
 *   lvl 3 = Arbad in a Myangad (manages 1000)
 *   lvl 4 = Arbad in a Tumed (manages 10000)
 *
 * Tumed is the MAXIMUM unit — Tumeds cooperate but NEVER merge.
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
        memberTumeds: {
          where: { isActive: true },
          include: {
            memberMyangads: {
              where: { isActive: true },
              include: {
                memberZuns: {
                  where: { isActive: true },
                  include: {
                    memberArbads: true,
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
  // ZUN MANAGEMENT (lvl 2: 10 Arbads = 100)
  // ────────────────────────────────────

  async listZuns(myangadId?: string) {
    const where: any = { isActive: true };
    if (myangadId) where.myangadId = myangadId;

    return this.prisma.zun.findMany({
      where,
      include: {
        memberArbads: true,
        myangad: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getZun(zunId: string) {
    const zun = await this.prisma.zun.findUnique({
      where: { id: zunId },
      include: {
        memberArbads: true,
        myangad: { select: { id: true, name: true } },
      },
    });
    if (!zun) throw new NotFoundException('Цзун не найден');
    return zun;
  }

  async joinZun(arbadId: bigint, zunId: string) {
    const zun = await this.prisma.zun.findUnique({
      where: { id: zunId },
      include: { memberArbads: true },
    });
    if (!zun) throw new NotFoundException('Цзун не найден');

    // Enforce max 10 Arbads per Zun
    if (zun.memberArbads.length >= 10) {
      throw new BadRequestException('Цзун уже полон (макс. 10 Арбанов)');
    }

    // Check if Arbad already belongs to a Zun
    const arbad = await this.prisma.familyArbad.findUnique({
      where: { arbadId },
    });
    if (!arbad) throw new NotFoundException('Арбан не найден');
    if (arbad.zunId) {
      throw new BadRequestException('Арбан уже состоит в другом Цзуне');
    }

    const updated = await this.prisma.familyArbad.update({
      where: { arbadId },
      data: { zunId: zun.zunId },
    });

    this.logger.log(`Arbad ${arbadId} joined Zun ${zunId} (lvl 1→2)`);
    return updated;
  }

  async leaveZun(arbadId: bigint) {
    const arbad = await this.prisma.familyArbad.findUnique({
      where: { arbadId },
    });
    if (!arbad) throw new NotFoundException('Арбан не найден');
    if (!arbad.zunId) {
      throw new BadRequestException('Арбан не состоит ни в каком Цзуне');
    }

    const updated = await this.prisma.familyArbad.update({
      where: { arbadId },
      data: { zunId: null },
    });

    this.logger.log(`Arbad ${arbadId} left Zun (lvl 2→1)`);
    return updated;
  }

  // ────────────────────────────────────
  // MYANGAD MANAGEMENT (lvl 3: 10 Zuns = 1000)
  // ────────────────────────────────────

  async listMyangads(tumedId?: string) {
    const where: any = { isActive: true };
    if (tumedId) where.tumedId = tumedId;

    return this.prisma.myangad.findMany({
      where,
      include: {
        memberZuns: { include: { _count: { select: { memberArbads: true } } } },
        tumed: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyangad(id: string) {
    const myangad = await this.prisma.myangad.findUnique({
      where: { id },
      include: {
        memberZuns: {
          include: { memberArbads: true },
        },
        tumed: { select: { id: true, name: true } },
      },
    });
    if (!myangad) throw new NotFoundException('Мянган не найден');
    return myangad;
  }

  async joinMyangad(zunId: string, myanganId: string) {
    const myangad = await this.prisma.myangad.findUnique({
      where: { id: myangadId },
      include: { memberZuns: true },
    });
    if (!myangad) throw new NotFoundException('Мянган не найден');

    // Enforce max 10 Zuns per Myangad
    if (myangad.memberZuns.length >= 10) {
      throw new BadRequestException('Мянган уже полон (макс. 10 Цзунов)');
    }

    // Check Zun exists and isn't already in a Myangad
    const zun = await this.prisma.zun.findUnique({ where: { id: zunId } });
    if (!zun) throw new NotFoundException('Цзун не найден');
    if (zun.myangadId) {
      throw new BadRequestException('Цзун уже состоит в другом Мянгане');
    }

    const updated = await this.prisma.zun.update({
      where: { id: zunId },
      data: { myangadId },
    });

    // Recalculate Myangad stats
    await this.recalcMyangadStats(myangadId);
    this.logger.log(`Zun ${zunId} joined Myangad ${myangadId} (lvl 2→3)`);
    return updated;
  }

  // ────────────────────────────────────
  // TUMED MANAGEMENT (lvl 4: 10 Myangads = 10000)
  // ────────────────────────────────────

  async listTumeds(republicId?: string) {
    const where: any = { isActive: true };
    if (republicId) where.republicId = republicId;

    return this.prisma.tumed.findMany({
      where,
      include: {
        memberMyangads: {
          include: { _count: { select: { memberZuns: true } } },
        },
        republic: { select: { id: true, name: true } },
        cooperationsAsA: { where: { status: 'ACTIVE' }, include: { tumedB: { select: { id: true, name: true } } } },
        cooperationsAsB: { where: { status: 'ACTIVE' }, include: { tumedA: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTumed(id: string) {
    const tumed = await this.prisma.tumed.findUnique({
      where: { id },
      include: {
        memberMyangads: {
          include: {
            memberZuns: {
              include: { _count: { select: { memberArbads: true } } },
            },
          },
        },
        republic: { select: { id: true, name: true } },
        cooperationsAsA: { include: { tumedB: { select: { id: true, name: true } } } },
        cooperationsAsB: { include: { tumedA: { select: { id: true, name: true } } } },
      },
    });
    if (!tumed) throw new NotFoundException('Тумэн не найден');
    return tumed;
  }

  async joinTumed(myanganId: string, tumedId: string) {
    const tumed = await this.prisma.tumed.findUnique({
      where: { id: tumedId },
      include: { memberMyangads: true },
    });
    if (!tumed) throw new NotFoundException('Тумэн не найден');

    // Enforce max 10 Myangads per Tumed
    if (tumed.memberMyangads.length >= 10) {
      throw new BadRequestException('Тумэн уже полон (макс. 10 Мянганов)');
    }

    const myangad = await this.prisma.myangad.findUnique({ where: { id: myangadId } });
    if (!myangad) throw new NotFoundException('Мянган не найден');
    if (myangad.tumedId) {
      throw new BadRequestException('Мянган уже состоит в другом Тумэне');
    }

    const updated = await this.prisma.myangad.update({
      where: { id: myangadId },
      data: { tumedId },
    });

    // Recalculate Tumed stats
    await this.recalcTumedStats(tumedId);
    this.logger.log(`Myangad ${myangadId} joined Tumed ${tumedId} (lvl 3→4)`);
    return updated;
  }

  // ────────────────────────────────────
  // STATISTICS RECALCULATION
  // ────────────────────────────────────

  private async recalcMyangadStats(myanganId: string) {
    const myangad = await this.prisma.myangad.findUnique({
      where: { id: myangadId },
      include: {
        memberZuns: { include: { memberArbads: true } },
      },
    });
    if (!myangad) return;

    const totalArbads = myangad.memberZuns.reduce(
      (acc, zun) => acc + zun.memberArbads.length,
      0,
    );
    const totalMembers = totalArbads * 10; // Each Arbad = 10 people

    await this.prisma.myangad.update({
      where: { id: myangadId },
      data: { totalArbads, totalMembers },
    });
  }

  private async recalcTumedStats(tumedId: string) {
    const tumed = await this.prisma.tumed.findUnique({
      where: { id: tumedId },
      include: {
        memberMyangads: {
          include: { memberZuns: { include: { memberArbads: true } } },
        },
      },
    });
    if (!tumed) return;

    let totalArbads = 0;
    for (const myangad of tumed.memberMyangads) {
      for (const zun of myangad.memberZuns) {
        totalArbads += zun.memberArbads.length;
      }
    }
    const totalMembers = totalArbads * 10;

    await this.prisma.tumed.update({
      where: { id: tumedId },
      data: { totalArbads, totalMembers },
    });
  }

  // ────────────────────────────────────
  // TUMED COOPERATION (not merger!)
  // ────────────────────────────────────

  async proposeCooperation(
    tumedId: string,
    targetTumedId: string,
    userId: string,
    data: { title: string; description?: string; treaty?: string },
  ) {
    // Verify proposer is Tumed leader
    const tumed = await this.prisma.tumed.findUnique({ where: { id: tumedId } });
    if (!tumed) throw new NotFoundException('Тумэн не найден');
    if (tumed.leaderUserId !== userId) {
      throw new BadRequestException('Только лидер Тумэна может предложить сотрудничество');
    }

    const targetTumed = await this.prisma.tumed.findUnique({ where: { id: targetTumedId } });
    if (!targetTumed) throw new NotFoundException('Целевой Тумэн не найден');

    // Check for existing cooperation
    const existing = await this.prisma.tumedCooperation.findFirst({
      where: {
        OR: [
          { tumedAId: tumedId, tumedBId: targetTumedId },
          { tumedAId: targetTumedId, tumedBId: tumedId },
        ],
        status: { in: ['PROPOSED', 'ACTIVE'] },
      },
    });
    if (existing) {
      throw new BadRequestException('Сотрудничество или предложение уже существует');
    }

    const cooperation = await this.prisma.tumedCooperation.create({
      data: {
        tumedAId: tumedId,
        tumedBId: targetTumedId,
        title: data.title,
        description: data.description,
        treaty: data.treaty,
        proposedById: userId,
        status: 'PROPOSED',
      },
    });

    // Notify target Tumed leader
    if (targetTumed.leaderUserId) {
      await this.prisma.notification.create({
        data: {
          userId: targetTumed.leaderUserId,
          type: 'NEW_MESSAGE',
          title: 'Предложение о сотрудничестве',
          body: `Тумэн "${tumed.name}" предлагает сотрудничество: ${data.title}`,
          linkUrl: `/hierarchy/tumeds/${targetTumedId}`,
        },
      });
    }

    this.logger.log(`Cooperation proposed: ${tumedId} → ${targetTumedId}`);
    return cooperation;
  }

  async respondToCooperation(cooperationId: string, userId: string, accept: boolean) {
    const coop = await this.prisma.tumedCooperation.findUnique({
      where: { id: cooperationId },
      include: {
        tumedA: true,
        tumedB: true,
      },
    });
    if (!coop) throw new NotFoundException('Предложение не найдено');
    if (coop.status !== 'PROPOSED') {
      throw new BadRequestException('Предложение уже обработано');
    }

    // Only target Tumed leader can respond
    if (coop.tumedB.leaderUserId !== userId) {
      throw new BadRequestException('Только лидер целевого Тумэна может ответить');
    }

    if (accept) {
      const updated = await this.prisma.tumedCooperation.update({
        where: { id: cooperationId },
        data: { status: 'ACTIVE', signedAt: new Date() },
      });
      this.logger.log(`Cooperation accepted: ${coop.tumedAId} ↔ ${coop.tumedBId}`);
      return updated;
    } else {
      const updated = await this.prisma.tumedCooperation.update({
        where: { id: cooperationId },
        data: { status: 'DISSOLVED' },
      });
      this.logger.log(`Cooperation rejected: ${coop.tumedAId} ↗ ${coop.tumedBId}`);
      return updated;
    }
  }

  async dissolveCooperation(cooperationId: string, userId: string) {
    const coop = await this.prisma.tumedCooperation.findUnique({
      where: { id: cooperationId },
      include: { tumedA: true, tumedB: true },
    });
    if (!coop) throw new NotFoundException('Сотрудничество не найдено');
    if (coop.status !== 'ACTIVE') {
      throw new BadRequestException('Сотрудничество не активно');
    }

    // Either Tumed leader can dissolve
    if (coop.tumedA.leaderUserId !== userId && coop.tumedB.leaderUserId !== userId) {
      throw new BadRequestException('Только лидер одного из Тумэнов может расторгнуть');
    }

    const updated = await this.prisma.tumedCooperation.update({
      where: { id: cooperationId },
      data: { status: 'DISSOLVED' },
    });

    this.logger.log(`Cooperation dissolved: ${coop.tumedAId} ↔ ${coop.tumedBId}`);
    return updated;
  }

  async listCooperations(tumedId: string) {
    return this.prisma.tumedCooperation.findMany({
      where: {
        OR: [{ tumedAId: tumedId }, { tumedBId: tumedId }],
      },
      include: {
        tumedA: { select: { id: true, name: true, region: true, totalMembers: true } },
        tumedB: { select: { id: true, name: true, region: true, totalMembers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
