import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PowerBranchType, ProvisionalStatus, UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import { AssumeRoleDto, InitiateTransferDto, LogActionDto } from './dto/creator-mode.dto';

/**
 * CreatorModeService
 *
 * Allows the CREATOR to temporarily hold any government branch role.
 * This is the sovereign right of the Founding Creator — used only while the
 * system is under-populated and real citizens have not yet been elected/appointed.
 *
 * Key principles:
 * 1. Every action is logged immutably in CreatorAuditLog
 * 2. Creator INITIATES the Transfer of Power (never forced out)
 * 3. Once a Transfer Act is signed, the role is permanently TRANSFERRED
 * 4. All provisional roles are PUBLIC — citizens can see who holds what
 */
@Injectable()
export class CreatorModeService {
  private readonly logger = new Logger(CreatorModeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── GUARD ──────────────────────────────────────────────────────────────────

  /** Check if user is the Creator */
  private async ensureCreator(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || user.role !== UserRole.CREATOR) {
      throw new ForbiddenException('Only the Creator can use Creator Mode');
    }
  }

  /** Check if Creator has an ACTIVE provisional role for the given branch/role */
  async hasActiveProvisionalRole(
    creatorId: string,
    branch: PowerBranchType,
    roleName?: string,
  ): Promise<boolean> {
    const where: any = { creatorId, branch, status: ProvisionalStatus.ACTIVE };
    if (roleName) where.roleName = roleName;
    const count = await this.prisma.creatorProvisionalRole.count({ where });
    return count > 0;
  }

  // ── ASSUME ROLE ────────────────────────────────────────────────────────────

  /**
   * Creator takes a provisional government role.
   * Cannot take the same branch+roleName twice.
   */
  async assumeRole(creatorId: string, dto: AssumeRoleDto) {
    await this.ensureCreator(creatorId);

    // Idempotency — don't duplicate active roles
    const existing = await this.prisma.creatorProvisionalRole.findFirst({
      where: {
        creatorId,
        branch: dto.branch,
        roleName: dto.roleName,
        status: ProvisionalStatus.ACTIVE,
      },
    });
    if (existing) {
      return existing; // Already holding, return as-is
    }

    const provisionalRole = await this.prisma.creatorProvisionalRole.create({
      data: {
        creatorId,
        branch: dto.branch,
        roleName: dto.roleName,
        roleDisplayName: dto.roleDisplayName,
        orgId: dto.orgId,
        status: ProvisionalStatus.ACTIVE,
      },
    });

    this.logger.log(
      `[CREATOR_PROVISIONAL] Creator assumed role "${dto.roleName}" in ${dto.branch} branch`,
    );

    return provisionalRole;
  }

  // ── NAMING RIGHTS ──────────────────────────────────────────────────────────

  /**
   * Creator (while holding a branch) sets a display name for a provisional role.
   * This is the "naming rights" privilege — only the branch leader can name structures.
   */
  async setRoleDisplayName(
    creatorId: string,
    provisionalRoleId: string,
    displayName: string,
  ) {
    await this.ensureCreator(creatorId);
    return this.prisma.creatorProvisionalRole.update({
      where: { id: provisionalRoleId, creatorId },
      data: { roleDisplayName: displayName },
    });
  }

  // ── TRANSFER OF POWER ──────────────────────────────────────────────────────

  /**
   * Creator INITIATES the transfer of power to a citizen.
   * The Creator is always first — no one can force them out.
   *
   * This generates a Transfer Act hash (public commitment).
   * To finalize, the Creator signs it via signTransferAct().
   */
  async initiateTransfer(creatorId: string, dto: InitiateTransferDto) {
    await this.ensureCreator(creatorId);

    const role = await this.prisma.creatorProvisionalRole.findUnique({
      where: { id: dto.provisionalRoleId },
    });
    if (!role) throw new NotFoundException('Provisional role not found');
    if (role.creatorId !== creatorId) throw new ForbiddenException('Not your role');
    if (role.status !== ProvisionalStatus.ACTIVE) {
      throw new BadRequestException('Role is not ACTIVE — cannot initiate transfer');
    }

    // Verify the recipient citizen exists
    const citizen = await this.prisma.user.findUnique({
      where: { id: dto.transferredToId },
      select: { id: true, seatId: true, username: true, isVerified: true },
    });
    if (!citizen) throw new NotFoundException('Citizen not found');
    if (!citizen.isVerified) {
      throw new BadRequestException('Citizen must be verified before receiving government power');
    }

    // Generate Transfer Act hash — commitment to the transfer
    const actPayload = `${role.id}|${dto.transferredToId}|${role.roleName}|${Date.now()}`;
    const transferAct = createHash('sha256').update(actPayload).digest('hex');

    const updated = await this.prisma.creatorProvisionalRole.update({
      where: { id: dto.provisionalRoleId },
      data: {
        transferredToId: dto.transferredToId,
        transferAct,
        transferNote: dto.transferNote,
        // NOT yet TRANSFERRED — Creator must sign
      },
      include: { creator: { select: { seatId: true } } },
    });

    this.logger.log(
      `[CREATOR_PROVISIONAL] Creator initiated transfer of "${role.roleName}" to citizen ${dto.transferredToId}. Act: ${transferAct}`,
    );

    return {
      ...updated,
      transferAct,
      message: 'Transfer initiated. Sign the Transfer Act to complete the handover.',
    };
  }

  /**
   * Creator signs the Transfer Act — formally completing the handover of power.
   * After this, the provisional role is TRANSFERRED and immutable.
   */
  async signTransferAct(creatorId: string, provisionalRoleId: string) {
    await this.ensureCreator(creatorId);

    const role = await this.prisma.creatorProvisionalRole.findUnique({
      where: { id: provisionalRoleId },
    });
    if (!role) throw new NotFoundException('Provisional role not found');
    if (!role.transferredToId || !role.transferAct) {
      throw new BadRequestException('Transfer must be initiated first');
    }
    if (role.status === ProvisionalStatus.TRANSFERRED) {
      throw new BadRequestException('Transfer already completed');
    }

    const completed = await this.prisma.creatorProvisionalRole.update({
      where: { id: provisionalRoleId },
      data: {
        status: ProvisionalStatus.TRANSFERRED,
        endedAt: new Date(),
      },
    });

    // Log the momentous event
    await this.prisma.creatorAuditLog.create({
      data: {
        provisionalRoleId,
        action: 'TRANSFER_OF_POWER_SIGNED',
        targetId: role.transferredToId,
        targetType: 'User',
        metadata: {
          roleName: role.roleName,
          branch: role.branch,
          transferAct: role.transferAct,
          transferNote: role.transferNote,
        },
      },
    });

    this.logger.log(
      `[CREATOR_PROVISIONAL] ⚡ TRANSFER OF POWER COMPLETE: "${role.roleName}" in ${role.branch} → citizen ${role.transferredToId}`,
    );

    return {
      ...completed,
      message: `✅ Power transferred. ${role.roleName} is now held by citizen ${role.transferredToId}.`,
    };
  }

  // ── ACTIVE ROLES ───────────────────────────────────────────────────────────

  /** Get all currently ACTIVE provisional roles (public) */
  async getActiveRoles() {
    return this.prisma.creatorProvisionalRole.findMany({
      where: { status: ProvisionalStatus.ACTIVE },
      include: {
        creator: { select: { id: true, seatId: true, username: true } },
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  /** Get all roles (Creator only) — includes TRANSFERRED and DISSOLVED */
  async getAllRoles(creatorId: string) {
    await this.ensureCreator(creatorId);
    return this.prisma.creatorProvisionalRole.findMany({
      where: { creatorId },
      include: {
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  // ── AUDIT LOG ──────────────────────────────────────────────────────────────

  /** Log an action taken by the Creator while in a provisional role */
  async logAction(dto: LogActionDto) {
    return this.prisma.creatorAuditLog.create({
      data: {
        provisionalRoleId: dto.provisionalRoleId,
        action: dto.action,
        targetId: dto.targetId,
        targetType: dto.targetType,
        metadata: dto.metadata,
      },
    });
  }

  /** Get public audit log — all Creator actions (immutable, transparent) */
  async getPublicAuditLog(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.creatorAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provisionalRole: {
            select: { branch: true, roleName: true, roleDisplayName: true },
          },
        },
      }),
      this.prisma.creatorAuditLog.count(),
    ]);
    return { data: logs, total, page, limit };
  }

  // ── SYSTEM STATUS ──────────────────────────────────────────────────────────

  /**
   * Returns the governance formation status for the banner shown to all citizens.
   * Shows which branches are still PROVISIONAL (under Creator management).
   */
  async getGovernanceStatus() {
    const branches = [
      PowerBranchType.LEGISLATIVE,
      PowerBranchType.EXECUTIVE,
      PowerBranchType.JUDICIAL,
      PowerBranchType.BANKING,
    ];

    const statuses = await Promise.all(
      branches.map(async (branch) => {
        const activeRoles = await this.prisma.creatorProvisionalRole.findMany({
          where: { branch, status: ProvisionalStatus.ACTIVE },
          select: { roleName: true, roleDisplayName: true, startedAt: true },
        });
        const transferredCount = await this.prisma.creatorProvisionalRole.count({
          where: { branch, status: ProvisionalStatus.TRANSFERRED },
        });
        return {
          branch,
          isProvisional: activeRoles.length > 0,
          provisionalRoles: activeRoles,
          transferredRoles: transferredCount,
        };
      }),
    );

    const anyProvisional = statuses.some((s) => s.isProvisional);
    return {
      isFormationPeriod: anyProvisional,
      banner: anyProvisional
        ? '🏛️ Государство формируется — примите участие в строительстве суверенной системы'
        : null,
      branches: statuses,
    };
  }
}
