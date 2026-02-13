import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CitizenshipService — управление гражданским статусом и исключительным земельным правом.
 *
 * Ключевые принципы:
 * 1. Коренной народ (INDIGENOUS) — источник власти
 * 2. Исключительное земельное право передаётся ТОЛЬКО по мужской линии (отец → сын)
 * 3. Если нет сына — право возвращается в Земельный Фонд
 * 4. Некоренные (CITIZEN) — полноценные граждане с правом голоса, имущества, но без законодательного права
 * 5. Жители (RESIDENT) — зарегистрированы, но не приняты
 */
@Injectable()
export class CitizenshipService {
  private readonly logger = new Logger(CitizenshipService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================
  //  EXCLUSIVE LAND RIGHT
  // ===========================

  /**
   * Grant initial exclusive land right to an indigenous citizen.
   * Only for system/admin use during initial setup.
   */
  async grantInitialRight(userId: string, grantedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.gender !== 'MALE') {
      throw new BadRequestException('Исключительное земельное право — прерогатива мужского пола');
    }
    if (user.hasExclusiveLandRight) {
      throw new BadRequestException('User already holds exclusive land right');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          citizenType: 'INDIGENOUS',
          hasExclusiveLandRight: true,
          exclusiveRightGrantedAt: new Date(),
          exclusiveRightGrantedBy: grantedBy,
        },
      }),
      this.prisma.exclusiveRightTransfer.create({
        data: {
          fromUserId: null,
          toUserId: userId,
          type: 'INITIAL_GRANT',
          reason: `Initial grant by ${grantedBy}`,
        },
      }),
    ]);

    this.logger.log(`Initial exclusive right granted to ${userId} by ${grantedBy}`);
    return { success: true, userId };
  }

  /**
   * Inherit exclusive land right from father to son.
   * The father must hold the right and the son must be MALE.
   */
  async inheritRight(fatherId: string, sonId: string) {
    const [father, son] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: fatherId } }),
      this.prisma.user.findUnique({ where: { id: sonId } }),
    ]);

    if (!father) throw new NotFoundException('Father not found');
    if (!son) throw new NotFoundException('Son not found');
    if (!father.hasExclusiveLandRight) {
      throw new BadRequestException('Father does not hold exclusive land right');
    }
    if (son.gender !== 'MALE') {
      throw new BadRequestException('Исключительное право передаётся только по мужской линии');
    }
    if (son.fatherId !== fatherId) {
      throw new BadRequestException('Son must be registered as child of this father');
    }

    await this.prisma.$transaction([
      // Revoke from father
      this.prisma.user.update({
        where: { id: fatherId },
        data: {
          hasExclusiveLandRight: false,
          exclusiveRightRevokedAt: new Date(),
        },
      }),
      // Grant to son
      this.prisma.user.update({
        where: { id: sonId },
        data: {
          citizenType: 'INDIGENOUS',
          hasExclusiveLandRight: true,
          exclusiveRightGrantedAt: new Date(),
          exclusiveRightGrantedBy: fatherId,
        },
      }),
      // Audit trail
      this.prisma.exclusiveRightTransfer.create({
        data: {
          fromUserId: fatherId,
          toUserId: sonId,
          type: 'INHERITANCE',
          reason: 'Father to son inheritance',
        },
      }),
    ]);

    this.logger.log(`Exclusive right inherited: ${fatherId} → ${sonId}`);
    return { success: true, from: fatherId, to: sonId };
  }

  /**
   * Revert exclusive land right to the State Land Fund.
   * Called when the last male holder dies/is removed with no male heir.
   */
  async revertToFund(userId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { children: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.hasExclusiveLandRight) {
      throw new BadRequestException('User does not hold exclusive land right');
    }

    // Check for male heirs
    const maleHeirs = user.children.filter((c: any) => c.gender === 'MALE');
    if (maleHeirs.length > 0) {
      throw new BadRequestException(
        'Cannot revert — male heirs exist. Use inheritRight instead.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          hasExclusiveLandRight: false,
          exclusiveRightRevokedAt: new Date(),
        },
      }),
      this.prisma.exclusiveRightTransfer.create({
        data: {
          fromUserId: userId,
          toUserId: null,
          type: 'REVERSION_TO_FUND',
          reason: reason || 'No male heir — right returned to State Land Fund',
        },
      }),
    ]);

    this.logger.log(`Exclusive right reverted to fund from ${userId}: ${reason}`);
    return { success: true, userId, reason };
  }

  // ===========================
  //  KHURAL REPRESENTATION
  // ===========================

  /**
   * Delegate Khural seat to spouse.
   * Only holder of exclusive right can delegate.
   */
  async delegateKhuralSeat(holderId: string, spouseId: string) {
    const holder = await this.prisma.user.findUnique({ where: { id: holderId } });
    if (!holder) throw new NotFoundException('Holder not found');
    if (!holder.hasExclusiveLandRight) {
      throw new ForbiddenException('Only exclusive right holders can delegate Khural seat');
    }

    await this.prisma.user.update({
      where: { id: holderId },
      data: { khuralRepresentativeId: spouseId },
    });

    this.logger.log(`Khural delegation: ${holderId} → ${spouseId}`);
    return { success: true, delegatedTo: spouseId };
  }

  /**
   * Revoke Khural delegation (represent yourself).
   */
  async revokeKhuralDelegation(holderId: string) {
    await this.prisma.user.update({
      where: { id: holderId },
      data: { khuralRepresentativeId: null },
    });
    return { success: true };
  }

  // ===========================
  //  CITIZENSHIP ADMISSION
  // ===========================

  /**
   * Apply for citizenship (RESIDENT → CITIZEN).
   * Creates an admission request that indigenous citizens vote on.
   */
  async applyForCitizenship(applicantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: applicantId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.citizenType !== 'RESIDENT') {
      throw new BadRequestException('Only RESIDENT can apply for citizenship');
    }

    // Check for existing pending application
    const existing = await this.prisma.citizenshipAdmission.findFirst({
      where: { applicantId, status: 'PENDING' },
    });
    if (existing) throw new BadRequestException('Pending application already exists');

    return this.prisma.citizenshipAdmission.create({
      data: { applicantId, status: 'PENDING' },
    });
  }

  /**
   * Vote on a citizenship admission. Only INDIGENOUS citizens can vote.
   */
  async voteOnAdmission(
    admissionId: string,
    voterId: string,
    vote: 'FOR' | 'AGAINST',
    comment?: string,
  ) {
    const [admission, voter] = await Promise.all([
      this.prisma.citizenshipAdmission.findUnique({ where: { id: admissionId } }),
      this.prisma.user.findUnique({ where: { id: voterId } }),
    ]);

    if (!admission) throw new NotFoundException('Admission not found');
    if (admission.status !== 'PENDING') {
      throw new BadRequestException('Admission is no longer pending');
    }
    if (!voter) throw new NotFoundException('Voter not found');
    if (voter.citizenType !== 'INDIGENOUS') {
      throw new ForbiddenException('Только коренные сибиряки могут голосовать за принятие граждан');
    }

    const castVote = await this.prisma.citizenshipAdmissionVote.create({
      data: { admissionId, voterId, vote, comment },
    });

    // Update counts
    const counts = await this.prisma.citizenshipAdmissionVote.groupBy({
      by: ['vote'],
      where: { admissionId },
      _count: true,
    });

    const votesFor = counts.find((c) => c.vote === 'FOR')?._count ?? 0;
    const votesAgainst = counts.find((c) => c.vote === 'AGAINST')?._count ?? 0;

    await this.prisma.citizenshipAdmission.update({
      where: { id: admissionId },
      data: { votesFor, votesAgainst },
    });

    // Auto-resolve if quorum reached
    if (votesFor >= admission.quorum) {
      await this.resolveAdmission(admissionId, 'APPROVED');
    } else if (votesAgainst >= admission.quorum) {
      await this.resolveAdmission(admissionId, 'REJECTED');
    }

    return castVote;
  }

  /**
   * Resolve admission — grant or reject citizenship.
   */
  private async resolveAdmission(admissionId: string, status: 'APPROVED' | 'REJECTED') {
    const admission = await this.prisma.citizenshipAdmission.update({
      where: { id: admissionId },
      data: { status, decidedAt: new Date() },
    });

    if (status === 'APPROVED') {
      await this.prisma.user.update({
        where: { id: admission.applicantId },
        data: { citizenType: 'CITIZEN' },
      });
      this.logger.log(`Citizenship APPROVED for ${admission.applicantId}`);
    } else {
      this.logger.log(`Citizenship REJECTED for ${admission.applicantId}`);
    }

    return admission;
  }

  /**
   * List pending admissions (for indigenous voters).
   */
  async listPendingAdmissions() {
    return this.prisma.citizenshipAdmission.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================
  //  ELIGIBILITY CHECKS (used by guards)
  // ===========================

  /**
   * Check if user can participate in legislative branch (Khural / law-making).
   * Only holders of exclusive land right OR their delegated representative.
   */
  async canParticipateInLegislature(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { khuralDelegations: true },
    });
    if (!user) return false;

    // Direct holder
    if (user.hasExclusiveLandRight) return true;

    // Delegated representative (spouse)
    const delegatedBy = await this.prisma.user.findFirst({
      where: {
        khuralRepresentativeId: userId,
        hasExclusiveLandRight: true,
      },
    });
    return !!delegatedBy;
  }

  /**
   * Check if user can participate in executive/judicial/banking branches.
   * Any CITIZEN or INDIGENOUS can participate.
   */
  async canParticipateInGovernment(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    return user.citizenType === 'CITIZEN' || user.citizenType === 'INDIGENOUS';
  }

  /**
   * Check if user can vote in State Land Fund decisions.
   * Only INDIGENOUS citizens.
   */
  async canVoteInLandFund(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;
    return user.citizenType === 'INDIGENOUS';
  }

  /**
   * Get exclusive right transfer history for a user.
   */
  async getRightHistory(userId: string) {
    return this.prisma.exclusiveRightTransfer.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
