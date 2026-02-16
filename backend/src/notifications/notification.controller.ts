import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/notifications — Get my notifications (paginated)
   */
  @Get()
  async getNotifications(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: NotificationType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.getForUser(req.user.userId, {
      unreadOnly: unreadOnly === 'true',
      type,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * GET /api/notifications/unread-count — Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  /**
   * PUT /api/notifications/:id/read — Mark as read
   */
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  /**
   * POST /api/notifications/read-all — Mark all as read
   */
  @Post('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.userId);
  }

  /**
   * PUT /api/notifications/:id/dismiss — Dismiss a notification
   */
  @Put(':id/dismiss')
  async dismiss(@Param('id') id: string, @Request() req) {
    return this.notificationService.dismiss(id, req.user.userId);
  }
}
