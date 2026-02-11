import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationType } from '@prisma/client';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a direct message conversation between two users
   */
  async createDirectMessage(userId1: string, userId2: string) {
    // Check if DM already exists between these users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT_MESSAGE',
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
      include: { participants: { include: { user: { select: { id: true, username: true } } } } },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT_MESSAGE',
        participants: {
          create: [
            { userId: userId1, role: 'MEMBER' },
            { userId: userId2, role: 'MEMBER' },
          ],
        },
      },
      include: { participants: { include: { user: { select: { id: true, username: true } } } } },
    });
  }

  /**
   * Create a group or context-bound conversation
   */
  async createConversation(
    creatorId: string,
    data: {
      name: string;
      type: ConversationType;
      participantIds?: string[];
      organizationId?: string;
      questId?: string;
      contractId?: string;
      caseId?: string;
    },
  ) {
    const participantIds = [creatorId, ...(data.participantIds || [])];
    const uniqueParticipantIds = [...new Set(participantIds)];

    return this.prisma.conversation.create({
      data: {
        name: data.name,
        type: data.type,
        organizationId: data.organizationId,
        questId: data.questId,
        contractId: data.contractId,
        caseId: data.caseId,
        participants: {
          create: uniqueParticipantIds.map((uid, i) => ({
            userId: uid,
            role: uid === creatorId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, username: true } } } },
      },
    });
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    senderId: string,
    conversationId: string,
    body: string,
    replyToId?: string,
    attachments?: string[],
  ) {
    // Verify sender is a participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        replyToId,
        attachments: attachments || [],
      },
      include: {
        sender: { select: { id: true, username: true } },
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Update sender's lastReadAt
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: senderId } },
      data: { lastReadAt: new Date() },
    });

    // Create notifications for other participants
    const otherParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId }, isMuted: false },
      select: { userId: true },
    });

    if (otherParticipants.length > 0) {
      await this.prisma.notification.createMany({
        data: otherParticipants.map((p) => ({
          userId: p.userId,
          type: 'NEW_MESSAGE' as any,
          title: 'Новое сообщение',
          body: body.substring(0, 100),
          linkUrl: `/messages/${conversationId}`,
          sourceUserId: senderId,
        })),
      });
    }

    return message;
  }

  /**
   * Get messages in a conversation with pagination
   */
  async getMessages(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit: number = 50,
  ) {
    // Verify user is a participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true } },
      },
    });

    // Update lastReadAt
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return messages;
  }

  /**
   * Get user's conversations with last message preview
   */
  async getUserConversations(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { select: { id: true, username: true } } },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: { sender: { select: { id: true, username: true } } },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return participations.map((p) => {
      const unreadCount = p.lastReadAt
        ? 0 // Will be calculated separately if needed
        : p.conversation.messages.length;

      return {
        ...p.conversation,
        lastReadAt: p.lastReadAt,
        isMuted: p.isMuted,
        myRole: p.role,
        unreadCount,
      };
    });
  }

  /**
   * Add participant to a group conversation
   */
  async addParticipant(
    adminId: string,
    conversationId: string,
    userId: string,
    role: string = 'MEMBER',
  ) {
    // Verify admin role
    const admin = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: adminId } },
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can add participants');
    }

    return this.prisma.conversationParticipant.create({
      data: { conversationId, userId, role },
      include: { user: { select: { id: true, username: true } } },
    });
  }

  /**
   * Leave a conversation
   */
  async leaveConversation(userId: string, conversationId: string) {
    return this.prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }

  /**
   * Mute/unmute a conversation
   */
  async toggleMute(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      throw new NotFoundException('Participation not found');
    }

    return this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isMuted: !participant.isMuted },
    });
  }

  /**
   * Edit a message (only sender can edit)
   */
  async editMessage(userId: string, messageId: string, newBody: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Only sender can edit');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { body: newBody, isEdited: true, editedAt: new Date() },
    });
  }

  /**
   * Soft-delete a message
   */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });

    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Only sender can delete');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
