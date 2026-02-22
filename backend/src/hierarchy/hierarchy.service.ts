import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * HierarchyService — manages the Arbad→Zun→Myangad→Tumed hierarchy.
 *
 * Strict decimal structure:
 *   Arbad  = 10 people  (min 2 founding leaders)
 *   Zun    = 100 people = 10 Arbads  (min 2 Arbad leaders to create)
 *   Myangad = 1000 people = 10 Zuns  (min 2 Zun leaders to create)
 *   Tumed  = 10,000 people = 10 Myangads  (min 2 Myangad leaders to create)
 *   → Legislative: Tumeds form RepublicanKhural → ConfederativeKhural
 *
 * Tumed is the MAXIMUM unit in executive/judicial/banking branches.
 * Only in the LEGISLATIVE branch do Tumeds form higher structures.
 */
@Injectable()
export class HierarchyService {
  private readonly logger = new Logger(HierarchyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────
  // FULL TREE (paginated — no more 200MB responses)
  // ────────────────────────────────────

  async getHierarchyTree(opts: {
    republicId?: string;
    tumedId?: string;
    myangadId?: string;
    zunId?: string;
    take?: number;
    cursor?: string;
  } = {}) {
    const { take = 10 } = opts;

    // Level 4 (deepest requested): one Zun → its Arbads
    if (opts.zunId) {
      return this.prisma.zun.findUnique({
        where: { id: opts.zunId },
        include: {
          memberArbads: { take, ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}) },
          myangad: { select: { id: true, name: true } },
        },
      });
    }

    // Level 3: one Myangad → its Zuns (with member counts only)
    if (opts.myangadId) {
      return this.prisma.myangad.findUnique({
        where: { id: opts.myangadId },
        include: {
          memberZuns: {
            select: { id: true, name: true, isActive: true, _count: { select: { memberArbads: true } } },
            take,
            ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
          },
          tumed: { select: { id: true, name: true } },
        },
      });
    }

    // Level 2: one Tumed → its Myangads (with stat summaries)
    if (opts.tumedId) {
      return this.prisma.tumed.findUnique({
        where: { id: opts.tumedId },
        include: {
          memberMyangads: {
            select: {
              id: true, name: true, region: true, totalMembers: true, totalArbads: true, isActive: true,
              _count: { select: { memberZuns: true } },
            },
            take,
            ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
          },
          republic: { select: { id: true, name: true } },
          cooperationsAsA: { where: { status: 'ACTIVE' }, include: { tumedB: { select: { id: true, name: true } } } },
          cooperationsAsB: { where: { status: 'ACTIVE' }, include: { tumedA: { select: { id: true, name: true } } } },
        },
      });
    }

    // Level 1 (default): Republics → Tumeds (summary only)
    const where: Prisma.RepublicanKhuralWhereInput = opts.republicId
      ? { id: opts.republicId }
      : { isActive: true };

    const republics = await this.prisma.republicanKhural.findMany({
      where,
      select: {
        id: true, name: true, republicKey: true, totalMembers: true, totalTumens: true,
        memberTumeds: {
          where: { isActive: true },
          select: { id: true, name: true, region: true, totalMembers: true, totalArbads: true },
          take,
          ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
        },
      },
    });

    const confederation = await this.prisma.confederativeKhural.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, totalMembers: true, totalRepublics: true,
        memberRepublics: { select: { id: true, name: true, republicKey: true, totalMembers: true } } },
    });

    return { confederation, republics };
  }

  // ────────────────────────────────────
  // CTE: Find all Arbads in a Tumed (O(depth × N) instead of O(n⁴))
  // ────────────────────────────────────

  async getAllArbadsInTumed(tumedId: string) {
    return this.prisma.$queryRaw<Array<{ arbadId: bigint; familyArbadId: string; zunId: string; myangadId: string }>>`
      WITH myangads AS (
        SELECT id AS myangad_id FROM "Myangad"
        WHERE "tumedId" = ${tumedId}::uuid AND "isActive" = true
      ),
      zuns AS (
        SELECT z.id AS zun_id, z."zunId" AS zun_on_chain_id, t.myangad_id
        FROM "Zun" z JOIN myangads t ON z."myangadId" = t.myangad_id
        WHERE z."isActive" = true
      ),
      arbads AS (
        SELECT fa."arbadId", fa.id AS family_arbad_id, z.zun_id, z.myangad_id
        FROM "FamilyArbad" fa
        JOIN zuns z ON fa."zunId" = z.zun_on_chain_id
      )
      SELECT "arbadId", family_arbad_id AS "familyArbadId",
             zun_id AS "zunId", myangad_id AS "myangadId"
      FROM arbads
      ORDER BY myangad_id, zun_id, "arbadId"`;
  }

  async getAllArbadsInMyangad(myangadId: string) {
    return this.prisma.$queryRaw<Array<{ arbadId: bigint; familyArbadId: string; zunId: string }>>`
      WITH zuns AS (
        SELECT z.id AS zun_id, z."zunId" AS zun_on_chain_id
        FROM "Zun" z WHERE z."myangadId" = ${myangadId}::uuid AND z."isActive" = true
      )
      SELECT fa."arbadId", fa.id AS "familyArbadId", z.zun_id AS "zunId"
      FROM "FamilyArbad" fa
      JOIN zuns z ON fa."zunId" = z.zun_on_chain_id
      ORDER BY z.zun_id, fa."arbadId"`;
  }

  // ────────────────────────────────────
  // ZUN MANAGEMENT — Atomic with Serializable isolation
  // ────────────────────────────────────

  async listZuns(myangadId?: string) {
    const where: Prisma.ZunWhereInput = { isActive: true };
    if (myangadId) where.myangadId = myangadId;

    return this.prisma.zun.findMany({
      where,
      include: {
        _count: { select: { memberArbads: true } },
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
    if (!zun) throw new NotFoundException('Zun not found');
    return zun;
  }

  /**
   * B1 FIX: Atomic join with Serializable isolation + FOR UPDATE lock.
   * Guarantees a Zun never exceeds 10 Arbads, even under 100 concurrent requests.
   */
  async joinZun(arbadId: bigint, zunId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the Zun row to prevent concurrent modifications
      const [zunRow] = await tx.$queryRaw<Array<{ id: string; zun_id: bigint }>>`
        SELECT id, "zunId" AS zun_id FROM "Zun"
        WHERE id = ${zunId}::uuid AND "isActive" = true
        FOR UPDATE`;

      if (!zunRow) throw new NotFoundException('Zun not found or inactive');

      // 2. Count inside the same transaction (accurate post-lock)
      const currentCount = await tx.familyArbad.count({
        where: { zunId: zunRow.zun_id },
      });
      if (currentCount >= 10) {
        throw new BadRequestException(`Zun is full: ${currentCount}/10 Arbads`);
      }

      // 3. Validate Arbad exists and isn't already in a Zun
      const arbad = await tx.familyArbad.findUnique({ where: { arbadId } });
      if (!arbad) throw new NotFoundException('Arbad not found');
      if (arbad.zunId !== null) {
        throw new BadRequestException('Arbad is already a member of another Zun');
      }

      // 4. Atomic update
      const updated = await tx.familyArbad.update({
        where: { arbadId },
        data: { zunId: zunRow.zun_id },
      });

      this.logger.log(`Arbad ${arbadId} joined Zun ${zunId} (${currentCount + 1}/10)`, {
        arbadId: arbadId.toString(), zunId, newCount: currentCount + 1,
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async leaveZun(arbadId: bigint) {
    const arbad = await this.prisma.familyArbad.findUnique({ where: { arbadId } });
    if (!arbad) throw new NotFoundException('Arbad not found');
    if (!arbad.zunId) throw new BadRequestException('Arbad is not in any Zun');

    const updated = await this.prisma.familyArbad.update({
      where: { arbadId },
      data: { zunId: null },
    });

    this.logger.log(`Arbad ${arbadId} left Zun (lvl 2→1)`, { arbadId: arbadId.toString() });
    return updated;
  }

  // ────────────────────────────────────
  // MYANGAD MANAGEMENT — Atomic
  // ────────────────────────────────────

  async listMyangads(tumedId?: string) {
    const where: Prisma.MyangadWhereInput = { isActive: true };
    if (tumedId) where.tumedId = tumedId;

    return this.prisma.myangad.findMany({
      where,
      select: {
        id: true, name: true, region: true, totalMembers: true, totalArbads: true,
        tumedId: true, tumed: { select: { id: true, name: true } },
        _count: { select: { memberZuns: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyangad(id: string) {
    const myangad = await this.prisma.myangad.findUnique({
      where: { id },
      include: {
        memberZuns: { include: { _count: { select: { memberArbads: true } } } },
        tumed: { select: { id: true, name: true } },
      },
    });
    if (!myangad) throw new NotFoundException('Myangad not found');
    return myangad;
  }

  /**
   * B1 FIX: Atomic Zun→Myangad join with Serializable isolation.
   */
  async joinMyangad(zunId: string, myangadId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the Myangad row
      const [myangadRow] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Myangad"
        WHERE id = ${myangadId}::uuid AND "isActive" = true
        FOR UPDATE`;

      if (!myangadRow) throw new NotFoundException('Myangad not found or inactive');

      // Count inside transaction
      const currentCount = await tx.zun.count({ where: { myangadId } });
      if (currentCount >= 10) {
        throw new BadRequestException(`Myangad is full: ${currentCount}/10 Zuns`);
      }

      const zun = await tx.zun.findUnique({ where: { id: zunId } });
      if (!zun) throw new NotFoundException('Zun not found');
      if (zun.myangadId) throw new BadRequestException('Zun is already in another Myangad');

      const updated = await tx.zun.update({
        where: { id: zunId },
        data: { myangadId },
      });

      // B2 FIX: SQL aggregation (not ORM data load)
      await this.recalcMyangadStats(tx, myangadId);

      this.logger.log(`Zun ${zunId} joined Myangad ${myangadId} (${currentCount + 1}/10)`, {
        zunId, myangadId, newCount: currentCount + 1,
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ────────────────────────────────────
  // TUMED MANAGEMENT — Atomic
  // ────────────────────────────────────

  async listTumeds(republicId?: string) {
    const where: Prisma.TumedWhereInput = { isActive: true };
    if (republicId) where.republicId = republicId;

    return this.prisma.tumed.findMany({
      where,
      select: {
        id: true, name: true, region: true, totalMembers: true, totalArbads: true,
        republicId: true, republic: { select: { id: true, name: true } },
        _count: { select: { memberMyangads: true } },
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
          include: { _count: { select: { memberZuns: true } } },
        },
        republic: { select: { id: true, name: true } },
        cooperationsAsA: { include: { tumedB: { select: { id: true, name: true } } } },
        cooperationsAsB: { include: { tumedA: { select: { id: true, name: true } } } },
      },
    });
    if (!tumed) throw new NotFoundException('Tumed not found');
    return tumed;
  }

  /**
   * B1 FIX: Atomic Myangad→Tumed join.
   */
  async joinTumed(myangadId: string, tumedId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the Tumed row
      const [tumedRow] = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Tumed"
        WHERE id = ${tumedId}::uuid AND "isActive" = true
        FOR UPDATE`;

      if (!tumedRow) throw new NotFoundException('Tumed not found or inactive');

      const currentCount = await tx.myangad.count({ where: { tumedId } });
      if (currentCount >= 10) {
        throw new BadRequestException(`Tumed is full: ${currentCount}/10 Myangads`);
      }

      const myangad = await tx.myangad.findUnique({ where: { id: myangadId } });
      if (!myangad) throw new NotFoundException('Myangad not found');
      if (myangad.tumedId) throw new BadRequestException('Myangad is already in another Tumed');

      const updated = await tx.myangad.update({
        where: { id: myangadId },
        data: { tumedId },
      });

      // B2 FIX: SQL aggregation for Tumed stats
      await this.recalcTumedStats(tx, tumedId);

      this.logger.log(`Myangad ${myangadId} joined Tumed ${tumedId} (${currentCount + 1}/10)`, {
        myangadId, tumedId, newCount: currentCount + 1,
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ────────────────────────────────────
  // STATISTICS RECALCULATION (B2 FIX: SQL aggregation, not ORM data load)
  // ────────────────────────────────────

  /**
   * Pure SQL aggregation — no ORM object loading.
   * Called INSIDE a $transaction so it participates in the same atomic unit.
   */
  private async recalcMyangadStats(
    tx: Prisma.TransactionClient,
    myangadId: string,
  ) {
    await tx.$executeRaw`
      UPDATE "Myangad" SET
        "totalArbads" = (
          SELECT COUNT(*)
          FROM "FamilyArbad" fa
          JOIN "Zun" z ON z."zunId" = fa."zunId"
          WHERE z."myangadId" = ${myangadId}::uuid
        ),
        "totalMembers" = (
          SELECT COUNT(*) * 10
          FROM "FamilyArbad" fa
          JOIN "Zun" z ON z."zunId" = fa."zunId"
          WHERE z."myangadId" = ${myangadId}::uuid
        )
      WHERE id = ${myangadId}::uuid`;
  }

  private async recalcTumedStats(
    tx: Prisma.TransactionClient,
    tumedId: string,
  ) {
    await tx.$executeRaw`
      UPDATE "Tumed" SET
        "totalArbads" = (
          SELECT COUNT(*)
          FROM "FamilyArbad" fa
          JOIN "Zun" z ON z."zunId" = fa."zunId"
          JOIN "Myangad" m ON m.id = z."myangadId"
          WHERE m."tumedId" = ${tumedId}::uuid
        ),
        "totalMembers" = (
          SELECT COUNT(*) * 10
          FROM "FamilyArbad" fa
          JOIN "Zun" z ON z."zunId" = fa."zunId"
          JOIN "Myangad" m ON m.id = z."myangadId"
          WHERE m."tumedId" = ${tumedId}::uuid
        )
      WHERE id = ${tumedId}::uuid`;
  }

  // ────────────────────────────────────
  // TUMED COOPERATION
  // ────────────────────────────────────

  async proposeCooperation(
    tumedId: string,
    targetTumedId: string,
    userId: string,
    data: { title: string; description?: string; treaty?: string },
  ) {
    const tumed = await this.prisma.tumed.findUnique({ where: { id: tumedId } });
    if (!tumed) throw new NotFoundException('Tumed not found');
    if (tumed.leaderUserId !== userId) {
      throw new ForbiddenException('Only the Tumed leader can propose cooperation');
    }

    const targetTumed = await this.prisma.tumed.findUnique({ where: { id: targetTumedId } });
    if (!targetTumed) throw new NotFoundException('Target Tumed not found');
    if (tumedId === targetTumedId) {
      throw new BadRequestException('A Tumed cannot cooperate with itself');
    }

    const existing = await this.prisma.tumedCooperation.findFirst({
      where: {
        OR: [
          { tumedAId: tumedId, tumedBId: targetTumedId },
          { tumedAId: targetTumedId, tumedBId: tumedId },
        ],
        status: { in: ['PROPOSED', 'ACTIVE'] },
      },
    });
    if (existing) throw new BadRequestException('Cooperation proposal already exists');

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

    if (targetTumed.leaderUserId) {
      await this.prisma.notification.create({
        data: {
          userId: targetTumed.leaderUserId,
          type: 'NEW_MESSAGE',
          title: 'Cooperation Proposal',
          body: `Tumed "${tumed.name}" proposes cooperation: ${data.title}`,
          linkUrl: `/hierarchy/tumeds/${targetTumedId}`,
        },
      });
    }

    this.logger.log(`Cooperation proposed: ${tumedId} → ${targetTumedId}`, { tumedId, targetTumedId, title: data.title });
    return cooperation;
  }

  async respondToCooperation(cooperationId: string, userId: string, accept: boolean) {
    const coop = await this.prisma.tumedCooperation.findUnique({
      where: { id: cooperationId },
      include: { tumedA: true, tumedB: true },
    });
    if (!coop) throw new NotFoundException('Cooperation proposal not found');
    if (coop.status !== 'PROPOSED') throw new BadRequestException('Proposal already processed');
    if (coop.tumedB.leaderUserId !== userId) {
      throw new ForbiddenException('Only the target Tumed leader can respond');
    }

    const newStatus = accept ? 'ACTIVE' : 'DISSOLVED';
    const updated = await this.prisma.tumedCooperation.update({
      where: { id: cooperationId },
      data: { status: newStatus, ...(accept ? { signedAt: new Date() } : {}) },
    });

    this.logger.log(`Cooperation ${accept ? 'accepted' : 'rejected'}: ${coop.tumedAId} ↔ ${coop.tumedBId}`, {
      cooperationId, accept, tumedAId: coop.tumedAId, tumedBId: coop.tumedBId,
    });
    return updated;
  }

  async dissolveCooperation(cooperationId: string, userId: string) {
    const coop = await this.prisma.tumedCooperation.findUnique({
      where: { id: cooperationId },
      include: { tumedA: true, tumedB: true },
    });
    if (!coop) throw new NotFoundException('Cooperation not found');
    if (coop.status !== 'ACTIVE') throw new BadRequestException('Cooperation is not active');
    if (coop.tumedA.leaderUserId !== userId && coop.tumedB.leaderUserId !== userId) {
      throw new ForbiddenException('Only a leader of either Tumed can dissolve the cooperation');
    }

    const updated = await this.prisma.tumedCooperation.update({
      where: { id: cooperationId },
      data: { status: 'DISSOLVED' },
    });

    this.logger.log(`Cooperation dissolved: ${coop.tumedAId} ↔ ${coop.tumedBId}`, { cooperationId });
    return updated;
  }

  async listCooperations(tumedId: string) {
    return this.prisma.tumedCooperation.findMany({
      where: { OR: [{ tumedAId: tumedId }, { tumedBId: tumedId }] },
      include: {
        tumedA: { select: { id: true, name: true, region: true, totalMembers: true } },
        tumedB: { select: { id: true, name: true, region: true, totalMembers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
