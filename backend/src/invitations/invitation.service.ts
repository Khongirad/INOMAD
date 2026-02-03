import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationStatus, GuildInvitation } from '@prisma/client';

interface SendInvitationDto {
  guildId: string;
  inviterId: string;
  inviteeId: string;
  message?: string;
}

@Injectable()
export class InvitationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Send guild invitation
   * Validates: inviter is member, invitee has education (if required)
   */
  async sendInvitation(data: SendInvitationDto): Promise<GuildInvitation> {
    const { guildId, inviterId, inviteeId, message } = data;

    // 1. Get guild details
    const guild = await this.prisma.organization.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException('Guild not found');
    }

    if (guild.type !== 'GUILD') {
      throw new BadRequestException('Can only send invitations for guilds');
    }

    // 2. Check inviter is guild member
    const inviterMembership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: guildId,
        userId: inviterId,
        leftAt: null,
      },
    });

    if (!inviterMembership) {
      throw new ForbiddenException('Only guild members can send invitations');
    }

    // 3. Check invitee is not already a member
    const existingMembership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: guildId,
        userId: inviteeId,
        leftAt: null,
      },
    });

    if (existingMembership) {
      throw new BadRequestException('User is already a member');
    }

    // 4. Check for pending invitation
    const pendingInvitation = await this.prisma.guildInvitation.findFirst({
      where: {
        guildId,
        inviteeId,
        status: 'PENDING',
      },
    });

    if (pendingInvitation) {
      throw new BadRequestException('User already has a pending invitation');
    }

    // 5. If guild requires education, check invitee has it
    if (guild.requiresEducation && guild.fieldOfStudy) {
      const hasEducation = await this.hasVerifiedEducation(
        inviteeId,
        guild.fieldOfStudy
      );

      if (!hasEducation) {
        throw new ForbiddenException(
          `Invitee must have verified education in ${guild.fieldOfStudy}`
        );
      }
    }

    // 6. Create invitation
    return this.prisma.guildInvitation.create({
      data: {
        guildId,
        inviterId,
        inviteeId,
        message,
        status: 'PENDING',
      },
      include: {
        guild: true,
        inviter: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        invitee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Accept invitation (auto-creates membership)
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<GuildInvitation> {
    const invitation = await this.prisma.guildInvitation.findUnique({
      where: { id: invitationId },
      include: { guild: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('Not your invitation');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation already processed');
    }

    // Update invitation
    const updatedInvitation = await this.prisma.guildInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: {
        guild: true,
        inviter: true,
        invitee: true,
      },
    });

    // Add to guild with inviter tracking
    await this.prisma.organizationMember.create({
      data: {
        organizationId: invitation.guildId,
        userId,
        invitedBy: invitation.inviterId, // Track who invited
        role: 'MEMBER',
      },
    });

    return updatedInvitation;
  }

  /**
   * Reject invitation
   */
  async rejectInvitation(invitationId: string, userId: string): Promise<GuildInvitation> {
    const invitation = await this.prisma.guildInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException('Not your invitation');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Invitation already processed');
    }

    return this.prisma.guildInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
      },
      include: {
        guild: true,
        inviter: true,
        invitee: true,
      },
    });
  }

  /**
   * Cancel invitation (inviter only)
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.prisma.guildInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviterId !== userId) {
      throw new ForbiddenException('Only inviter can cancel');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    await this.prisma.guildInvitation.delete({
      where: { id: invitationId },
    });
  }

  /**
   * Get invitations sent by user
   */
  async getInvitationsSent(userId: string) {
    return this.prisma.guildInvitation.findMany({
      where: { inviterId: userId },
      include: {
        guild: true,
        invitee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get invitations received by user
   */
  async getInvitationsReceived(userId: string, statusFilter?: InvitationStatus) {
    const where: any = { inviteeId: userId };
    
    if (statusFilter) {
      where.status = statusFilter;
    }

    return this.prisma.guildInvitation.findMany({
      where,
      include: {
        guild: true,
        inviter: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get guild's invitations (for guild leaders)
   */
  async getGuildInvitations(guildId: string, userId: string) {
    // Check if user is guild leader/deputy
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: guildId,
        userId,
        role: { in: ['LEADER', 'DEPUTY'] },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Only guild leaders can view all invitations');
    }

    return this.prisma.guildInvitation.findMany({
      where: { guildId },
      include: {
        inviter: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        invitee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get invitation chain (who invited whom)
   */
  async getInvitationChain(userId: string, guildId: string) {
    const chain: any[] = [];
    let currentUserId = userId;

    // Traverse up the invitation chain
    while (currentUserId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: guildId,
          userId: currentUserId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          inviter: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!membership) break;

      chain.push({
        user: membership.user,
        invitedBy: membership.inviter,
        joinedAt: membership.joinedAt,
      });

      // Move up the chain
      currentUserId = membership.invitedBy || null;
    }

    return chain;
  }

  /**
   * Expire old pending invitations (cron job)
   */
  async expireOldInvitations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.guildInvitation.updateMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: 'EXPIRED',
        expiredAt: new Date(),
      },
    });

    return result.count;
  }

  // Helper: Check if user has verified education
  private async hasVerifiedEducation(userId: string, fieldOfStudy: string): Promise<boolean> {
    const education = await this.prisma.educationVerification.findFirst({
      where: {
        userId,
        fieldOfStudy,
        isVerified: true,
      },
    });

    return !!education;
  }
}
