import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MessagingService } from './messaging.service';

@Controller('api/messages')
@UseGuards(AuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * GET /api/messages/conversations — list user's conversations
   */
  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.messagingService.getUserConversations(req.user.id);
  }

  /**
   * POST /api/messages/dm — create or get direct message
   */
  @Post('dm')
  async createDirectMessage(@Req() req: any, @Body('targetUserId') targetUserId: string) {
    return this.messagingService.createDirectMessage(req.user.id, targetUserId);
  }

  /**
   * POST /api/messages/conversations — create group/context conversation
   */
  @Post('conversations')
  async createConversation(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      type: string;
      participantIds?: string[];
      organizationId?: string;
      questId?: string;
      contractId?: string;
      caseId?: string;
    },
  ) {
    return this.messagingService.createConversation(req.user.id, body as any);
  }

  /**
   * GET /api/messages/:conversationId — get messages in a conversation
   */
  @Get(':conversationId')
  async getMessages(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      req.user.id,
      conversationId,
      cursor,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * POST /api/messages/:conversationId — send a message
   */
  @Post(':conversationId')
  async sendMessage(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() body: { body: string; replyToId?: string; attachments?: string[] },
  ) {
    return this.messagingService.sendMessage(
      req.user.id,
      conversationId,
      body.body,
      body.replyToId,
      body.attachments,
    );
  }

  /**
   * POST /api/messages/:conversationId/participants — add participant
   */
  @Post(':conversationId/participants')
  async addParticipant(
    @Req() req: any,
    @Param('conversationId') conversationId: string,
    @Body() body: { userId: string; role?: string },
  ) {
    return this.messagingService.addParticipant(req.user.id, conversationId, body.userId, body.role);
  }

  /**
   * DELETE /api/messages/:conversationId/leave — leave conversation
   */
  @Delete(':conversationId/leave')
  async leaveConversation(@Req() req: any, @Param('conversationId') conversationId: string) {
    return this.messagingService.leaveConversation(req.user.id, conversationId);
  }

  /**
   * Put /api/messages/:conversationId/mute — toggle mute
   */
  @Put(':conversationId/mute')
  async toggleMute(@Req() req: any, @Param('conversationId') conversationId: string) {
    return this.messagingService.toggleMute(req.user.id, conversationId);
  }

  /**
   * PUT /api/messages/msg/:messageId — edit message
   */
  @Put('msg/:messageId')
  async editMessage(
    @Req() req: any,
    @Param('messageId') messageId: string,
    @Body('body') body: string,
  ) {
    return this.messagingService.editMessage(req.user.id, messageId, body);
  }

  /**
   * DELETE /api/messages/msg/:messageId — delete message
   */
  @Delete('msg/:messageId')
  async deleteMessage(@Req() req: any, @Param('messageId') messageId: string) {
    return this.messagingService.deleteMessage(req.user.id, messageId);
  }
}
