import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkActStatus } from '@prisma/client';

@Injectable()
export class WorkActService {
  private readonly logger = new Logger(WorkActService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new work act (draft)
   */
  async create(
    contractorId: string,
    data: {
      clientId: string;
      title: string;
      description: string;
      deliverables: string[];
      amount: number;
      currency?: string;
      questId?: string;
      contractId?: string;
      organizationId?: string;
    },
  ) {
    const workAct = await this.prisma.workAct.create({
      data: {
        contractorId,
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        deliverables: data.deliverables,
        amount: data.amount,
        currency: data.currency || 'ALTN',
        questId: data.questId,
        contractId: data.contractId,
        organizationId: data.organizationId,
        status: 'DRAFTED',
      },
      include: {
        contractor: { select: { id: true, username: true } },
        client: { select: { id: true, username: true } },
      },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: data.clientId,
        type: 'WORK_ACT_CREATED',
        title: 'Новый акт выполненных работ',
        body: `Создан акт: ${data.title} на сумму ${data.amount} ALTN`,
        linkUrl: `/work-acts/${workAct.id}`,
        sourceUserId: contractorId,
      },
    });

    this.logger.log(`WorkAct created: ${workAct.id} by ${contractorId}`);
    return workAct;
  }

  /**
   * Get work act by ID
   */
  async getById(id: string) {
    const workAct = await this.prisma.workAct.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, username: true } },
        client: { select: { id: true, username: true } },
      },
    });

    if (!workAct) throw new NotFoundException('Work act not found');
    return workAct;
  }

  /**
   * Submit work act for review (contractor → client)
   */
  async submit(workActId: string, contractorId: string) {
    const workAct = await this.getById(workActId);

    if (workAct.contractorId !== contractorId) {
      throw new ForbiddenException('Only the contractor can submit');
    }
    if (workAct.status !== 'DRAFTED') {
      throw new BadRequestException('Work act must be in DRAFTED status to submit');
    }

    const updated = await this.prisma.workAct.update({
      where: { id: workActId },
      data: { status: 'SUBMITTED' },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: workAct.clientId,
        type: 'WORK_ACT_CREATED',
        title: 'Акт отправлен на проверку',
        body: `Подрядчик подал акт "${workAct.title}" на проверку`,
        linkUrl: `/work-acts/${workActId}`,
        sourceUserId: contractorId,
      },
    });

    return updated;
  }

  /**
   * Client reviews the work act
   */
  async review(workActId: string, clientId: string) {
    const workAct = await this.getById(workActId);

    if (workAct.clientId !== clientId) {
      throw new ForbiddenException('Only the client can review');
    }
    if (workAct.status !== 'SUBMITTED') {
      throw new BadRequestException('Work act must be in SUBMITTED status to review');
    }

    return this.prisma.workAct.update({
      where: { id: workActId },
      data: { status: 'REVIEWED' },
    });
  }

  /**
   * Sign work act (contractor or client)
   */
  async sign(workActId: string, userId: string, signature: string) {
    const workAct = await this.getById(workActId);

    const isContractor = workAct.contractorId === userId;
    const isClient = workAct.clientId === userId;

    if (!isContractor && !isClient) {
      throw new ForbiddenException('Only parties can sign the work act');
    }

    const updateData: any = {};
    let newStatus = workAct.status;

    if (isContractor) {
      if (workAct.contractorSignature) {
        throw new BadRequestException('Contractor has already signed');
      }
      updateData.contractorSignature = signature;
      updateData.contractorSignedAt = new Date();

      if (workAct.clientSignature) {
        newStatus = 'SIGNED_BY_CLIENT'; // Both signed
      } else {
        newStatus = 'SIGNED_BY_CONTRACTOR';
      }
    }

    if (isClient) {
      if (workAct.clientSignature) {
        throw new BadRequestException('Client has already signed');
      }
      updateData.clientSignature = signature;
      updateData.clientSignedAt = new Date();

      if (workAct.contractorSignature) {
        newStatus = 'SIGNED_BY_CLIENT'; // Both signed
      } else {
        newStatus = 'SIGNED_BY_CLIENT';
      }
    }

    updateData.status = newStatus;

    const updated = await this.prisma.workAct.update({
      where: { id: workActId },
      data: updateData,
      include: {
        contractor: { select: { id: true, username: true } },
        client: { select: { id: true, username: true } },
      },
    });

    // Notify the other party
    const notifyUserId = isContractor ? workAct.clientId : workAct.contractorId;
    await this.prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: 'WORK_ACT_SIGNED',
        title: 'Акт подписан',
        body: `Акт "${workAct.title}" подписан`,
        linkUrl: `/work-acts/${workActId}`,
        sourceUserId: userId,
      },
    });

    // If both signed → mark COMPLETED
    if (updated.contractorSignature && updated.clientSignature) {
      const completed = await this.prisma.workAct.update({
        where: { id: workActId },
        data: { status: 'COMPLETED' },
        include: {
          contractor: { select: { id: true, username: true } },
          client: { select: { id: true, username: true } },
        },
      });

      // Notify both parties
      await this.prisma.notification.createMany({
        data: [
          {
            userId: workAct.contractorId,
            type: 'WORK_ACT_COMPLETED',
            title: 'Акт выполнен',
            body: `Акт "${workAct.title}" подписан обеими сторонами. Оплата: ${workAct.amount} ALTN`,
            linkUrl: `/work-acts/${workActId}`,
          },
          {
            userId: workAct.clientId,
            type: 'WORK_ACT_COMPLETED',
            title: 'Акт выполнен',
            body: `Акт "${workAct.title}" подписан обеими сторонами. Оплата: ${workAct.amount} ALTN`,
            linkUrl: `/work-acts/${workActId}`,
          },
        ],
      });

      this.logger.log(`WorkAct ${workActId} COMPLETED — both parties signed`);
      return completed;
    }

    return updated;
  }

  /**
   * Dispute a work act
   */
  async dispute(workActId: string, userId: string, reason: string) {
    const workAct = await this.getById(workActId);

    if (workAct.contractorId !== userId && workAct.clientId !== userId) {
      throw new ForbiddenException('Only parties can dispute');
    }

    return this.prisma.workAct.update({
      where: { id: workActId },
      data: { status: 'DISPUTED', disputeReason: reason },
    });
  }

  /**
   * Cancel a work act (only if DRAFTED)
   */
  async cancel(workActId: string, userId: string) {
    const workAct = await this.getById(workActId);

    if (workAct.contractorId !== userId) {
      throw new ForbiddenException('Only the contractor can cancel');
    }
    if (workAct.status !== 'DRAFTED') {
      throw new BadRequestException('Only drafted work acts can be cancelled');
    }

    return this.prisma.workAct.update({
      where: { id: workActId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * List work acts with filters
   */
  async list(filters?: {
    contractorId?: string;
    clientId?: string;
    organizationId?: string;
    questId?: string;
    status?: WorkActStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.contractorId) where.contractorId = filters.contractorId;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.organizationId) where.organizationId = filters.organizationId;
    if (filters?.questId) where.questId = filters.questId;
    if (filters?.status) where.status = filters.status;

    const [workActs, total] = await Promise.all([
      this.prisma.workAct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contractor: { select: { id: true, username: true } },
          client: { select: { id: true, username: true } },
        },
      }),
      this.prisma.workAct.count({ where }),
    ]);

    return { workActs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Record payment for a completed work act
   */
  async recordPayment(workActId: string, txHash: string) {
    const workAct = await this.getById(workActId);

    if (workAct.status !== 'COMPLETED') {
      throw new BadRequestException('Work act must be COMPLETED to record payment');
    }

    return this.prisma.workAct.update({
      where: { id: workActId },
      data: { paymentTxHash: txHash, paidAt: new Date() },
    });
  }
}
