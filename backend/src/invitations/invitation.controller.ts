import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationStatus } from '@prisma/client';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Send guild invitation
   */
  @Post('send')
  async sendInvitation(
    @Request() req,
    @Body() body: {
      guildId: string;
      inviteeId: string;
      message?: string;
    }
  ) {
    return this.invitationService.sendInvitation({
      guildId: body.guildId,
      inviterId: req.user.id,
      inviteeId: body.inviteeId,
      message: body.message,
    });
  }

  /**
   * Accept invitation
   */
  @Post(':id/accept')
  async acceptInvitation(@Request() req, @Param('id') invitationId: string) {
    return this.invitationService.acceptInvitation(invitationId, req.user.id);
  }

  /**
   * Reject invitation
   */
  @Post(':id/reject')
  async rejectInvitation(@Request() req, @Param('id') invitationId: string) {
    return this.invitationService.rejectInvitation(invitationId, req.user.id);
  }

  /**
   * Cancel invitation (inviter only)
   */
  @Delete(':id')
  async cancelInvitation(@Request() req, @Param('id') invitationId: string) {
    return this.invitationService.cancelInvitation(invitationId, req.user.id);
  }

  /**
   * Get invitations I sent
   */
  @Get('sent')
  async getInvitationsSent(@Request() req) {
    return this.invitationService.getInvitationsSent(req.user.id);
  }

  /**
   * Get invitations I received
   */
  @Get('received')
  async getInvitationsReceived(
    @Request() req,
    @Query('status') status?: InvitationStatus
  ) {
    return this.invitationService.getInvitationsReceived(req.user.id, status);
  }

  /**
   * Get guild's invitations (leaders only)
   */
  @Get('guild/:guildId')
  async getGuildInvitations(@Request() req, @Param('guildId') guildId: string) {
    return this.invitationService.getGuildInvitations(guildId, req.user.id);
  }

  /**
   * Get invitation chain (who invited whom)
   */
  @Get('chain/:userId/:guildId')
  async getInvitationChain(
    @Param('userId') userId: string,
    @Param('guildId') guildId: string
  ) {
    return this.invitationService.getInvitationChain(userId, guildId);
  }

  /**
   * Expire old invitations (admin cron)
   */
  @Post('expire')
  async expireOldInvitations(@Query('days') days?: number) {
    // TODO: Add admin role check
    const count = await this.invitationService.expireOldInvitations(
      days ? parseInt(days.toString()) : 30
    );
    return { expired: count };
  }
}
