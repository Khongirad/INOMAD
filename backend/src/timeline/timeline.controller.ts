import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventType, EventScope } from '@prisma/client';

@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Get('user/:userId')
  async getUserTimeline(
    @Param('userId') userId: string,
    @Query('scope') scope?: string,
    @Query('types') types?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timelineService.getUserTimeline(userId, {
      scope: scope ? scope.split(',') as EventScope[] : undefined,
      types: types ? types.split(',') as EventType[] : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':scope/:scopeId')
  async getHierarchicalTimeline(
    @Param('scope') scope: EventScope,
    @Param('scopeId') scopeId: string,
    @Query('types') types?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timelineService.getHierarchicalTimeline(scope, scopeId, {
      types: types ? types.split(',') as EventType[] : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('event')
  async createEvent(@Request() req, @Body() body: any) {
    return this.timelineService.createEvent({
      ...body,
      actorId: body.actorId || req.user.sub,
    });
  }

  @Get('contracts')
  async getMyContracts(@Request() req) {
    return this.timelineService.getUserContracts(req.user.sub);
  }

  @Get('event/:eventId')
  async getEvent(@Param('eventId') eventId: string) {
    return this.timelineService.getEvent(eventId);
  }
}
