import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeSourceType, DisputeStatus } from '@prisma/client';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Open a dispute — always bound to a source document
   * Auto-creates a Conversation for the two parties to negotiate
   */
  async openDispute(
    partyAId: string,
    data: {
      partyBId: string;
      sourceType: DisputeSourceType;
      sourceId: string;
      title: string;
      description: string;
    },
  ) {
    // Verify source exists
    await this.verifySource(data.sourceType, data.sourceId);

    // Check for existing open dispute on same source
    const existing = await this.prisma.dispute.findFirst({
      where: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        status: { in: ['OPENED', 'NEGOTIATING'] },
      },
    });
    if (existing) {
      throw new BadRequestException('По этому договору/заданию уже открыт спор');
    }

    // Auto-create a conversation for negotiation
    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'DIRECT_MESSAGE',
        name: `Спор: ${data.title}`,
        participants: {
          createMany: {
            data: [
              { userId: partyAId },
              { userId: data.partyBId },
            ],
          },
        },
      },
    });

    const dispute = await this.prisma.dispute.create({
      data: {
        partyAId,
        partyBId: data.partyBId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        title: data.title,
        description: data.description,
        conversationId: conversation.id,
        status: 'OPENED',
      },
      include: {
        partyA: { select: { id: true, username: true } },
        partyB: { select: { id: true, username: true } },
      },
    });

    // Notify party B
    await this.prisma.notification.create({
      data: {
        userId: data.partyBId,
        type: 'NEW_MESSAGE',
        title: 'Открыт спор',
        body: `${dispute.partyA.username} открыл спор: ${data.title}`,
        linkUrl: `/disputes/${dispute.id}`,
        sourceUserId: partyAId,
      },
    });

    this.logger.log(`Dispute opened: ${dispute.id} (${data.sourceType}/${data.sourceId})`);
    return dispute;
  }

  /**
   * Get dispute by ID
   */
  async getDispute(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        partyA: { select: { id: true, username: true } },
        partyB: { select: { id: true, username: true } },
        complaints: {
          select: { id: true, title: true, status: true, currentLevel: true },
        },
      },
    });
    if (!dispute) throw new NotFoundException('Спор не найден');
    return dispute;
  }

  /**
   * List disputes for a user
   */
  async listDisputes(userId: string, status?: DisputeStatus, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      OR: [{ partyAId: userId }, { partyBId: userId }],
    };
    if (status) where.status = status;

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          partyA: { select: { id: true, username: true } },
          partyB: { select: { id: true, username: true } },
          _count: { select: { complaints: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return { disputes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Mark dispute as actively negotiating
   */
  async startNegotiation(disputeId: string) {
    return this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'NEGOTIATING' },
    });
  }

  /**
   * Settle dispute — resolved by the parties themselves
   */
  async settle(disputeId: string, resolution: string) {
    const dispute = await this.getDispute(disputeId);

    if (['SETTLED', 'COMPLAINT_FILED', 'COURT_FILED'].includes(dispute.status)) {
      throw new BadRequestException('Спор уже закрыт');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'SETTLED', resolution },
    });

    // Notify both parties
    for (const userId of [dispute.partyAId, dispute.partyBId]) {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'NEW_MESSAGE',
          title: 'Спор урегулирован',
          body: `Спор "${dispute.title}" успешно разрешён`,
          linkUrl: `/disputes/${disputeId}`,
        },
      });
    }

    this.logger.log(`Dispute ${disputeId} settled`);
    return updated;
  }

  /**
   * Escalate dispute to complaint (soft path) — files a formal complaint
   */
  async escalateToComplaint(disputeId: string) {
    const dispute = await this.getDispute(disputeId);

    if (['SETTLED', 'COMPLAINT_FILED', 'COURT_FILED'].includes(dispute.status)) {
      throw new BadRequestException('Спор уже закрыт или подана жалоба');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'COMPLAINT_FILED' },
    });

    this.logger.log(`Dispute ${disputeId} escalated to complaint`);
    return { dispute: updated, message: 'Спор передан для подачи жалобы. Подайте жалобу с указанием disputeId.' };
  }

  /**
   * Escalate dispute directly to court (hard path)
   */
  async escalateToCourt(disputeId: string) {
    const dispute = await this.getDispute(disputeId);

    if (['SETTLED', 'COMPLAINT_FILED', 'COURT_FILED'].includes(dispute.status)) {
      throw new BadRequestException('Спор уже закрыт');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'COURT_FILED' },
    });

    // TODO: auto-create CouncilOfJustice case
    this.logger.warn(`Dispute ${disputeId} escalated directly to court`);
    return updated;
  }

  /**
   * Verify that the source document exists
   */
  private async verifySource(sourceType: DisputeSourceType, sourceId: string) {
    let exists = false;
    switch (sourceType) {
      case 'CONTRACT':
        exists = !!(await this.prisma.documentContract.findUnique({ where: { id: sourceId } }));
        break;
      case 'QUEST':
        exists = !!(await this.prisma.quest.findUnique({ where: { id: sourceId } }));
        break;
      case 'WORK_ACT':
        exists = !!(await this.prisma.workAct.findUnique({ where: { id: sourceId } }));
        break;
    }
    if (!exists) {
      throw new BadRequestException(`Источник не найден: ${sourceType}/${sourceId}`);
    }
  }
}
