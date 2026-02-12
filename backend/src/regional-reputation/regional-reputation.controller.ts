import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RegionalReputationService } from './regional-reputation.service';
import { ReputationActionType } from '@prisma/client';

@Controller('regional-reputation')
@UseGuards(AuthGuard)
export class RegionalReputationController {
  constructor(private readonly service: RegionalReputationService) {}

  // ── My reputation in a specific republic ──
  @Get('republic/:republicId/me')
  getMyProfile(@Param('republicId') republicId: string, @Request() req: any) {
    return this.service.getRegionalProfile(req.user.sub, republicId);
  }

  // ── Any user's reputation in a republic ──
  @Get('republic/:republicId/user/:userId')
  getUserProfile(
    @Param('republicId') republicId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getRegionalProfile(userId, republicId);
  }

  // ── All regions where I have reputation ──
  @Get('my-regions')
  getMyRegions(@Request() req: any) {
    return this.service.getUserRegions(req.user.sub);
  }

  // ── Leaderboard for a republic ──
  @Get('republic/:republicId/leaderboard')
  getLeaderboard(
    @Param('republicId') republicId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getLeaderboard(republicId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  // ── Recent actions feed for a republic ──
  @Get('republic/:republicId/feed')
  getRecentActions(
    @Param('republicId') republicId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecentActions(republicId, limit ? parseInt(limit) : 20);
  }

  // ── All republics with stats ──
  @Get('republics')
  getAllRepublicsStats() {
    return this.service.getAllRepublicsStats();
  }

  // ── Admin: manually award points ──
  @Post('award')
  awardPoints(
    @Body()
    body: {
      userId: string;
      republicId: string;
      actionType: ReputationActionType;
      points: number;
      description: string;
      questId?: string;
      contractId?: string;
      orgId?: string;
    },
  ) {
    return this.service.awardPoints(
      body.userId,
      body.republicId,
      body.actionType,
      body.points,
      body.description,
      { questId: body.questId, contractId: body.contractId, orgId: body.orgId },
    );
  }
}
