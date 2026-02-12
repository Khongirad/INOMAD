import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RegionalReputationService } from './regional-reputation.service';
import { ReputationActionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('regional-reputation')
@UseGuards(AuthGuard)
export class RegionalReputationController {
  constructor(
    private readonly service: RegionalReputationService,
    private readonly prisma: PrismaService,
  ) {}

  // ── My reputation in a specific republic ──
  @Get('republic/:republicId/me')
  getMyProfile(
    @Param('republicId', ParseUUIDPipe) republicId: string,
    @Request() req: any,
  ) {
    return this.service.getRegionalProfile(req.user.sub, republicId);
  }

  // ── Any user's reputation in a republic ──
  @Get('republic/:republicId/user/:userId')
  getUserProfile(
    @Param('republicId', ParseUUIDPipe) republicId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
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
    @Param('republicId', ParseUUIDPipe) republicId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.getLeaderboard(republicId, {
      limit: Math.min(50, Math.max(1, limit ? parseInt(limit) : 20)),
      offset: Math.max(0, offset ? parseInt(offset) : 0),
    });
  }

  // ── Recent actions feed for a republic ──
  @Get('republic/:republicId/feed')
  getRecentActions(
    @Param('republicId', ParseUUIDPipe) republicId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecentActions(
      republicId,
      Math.min(50, Math.max(1, limit ? parseInt(limit) : 20)),
    );
  }

  // ── All republics with stats ──
  @Get('republics')
  getAllRepublicsStats() {
    return this.service.getAllRepublicsStats();
  }

  // ── Admin: manually award points ──
  @Post('award')
  async awardPoints(
    @Request() req: any,
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
    // ── Admin check: only creator (superadmin) or org leaders can award ──
    const caller = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { role: true },
    });
    if (!caller || caller.role !== 'CREATOR') {
      throw new ForbiddenException('Только администратор может начислять очки вручную');
    }

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
