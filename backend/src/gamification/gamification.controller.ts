import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * GET /gamification/profile — Get current user's citizen level.
   */
  @Get('profile')
  async getMyProfile(@Req() req: any) {
    return this.gamificationService.getCitizenLevel(req.user.id);
  }

  /**
   * GET /gamification/profile/:userId — Get another citizen's level.
   */
  @Get('profile/:userId')
  async getProfile(@Param('userId') userId: string) {
    return this.gamificationService.getCitizenLevel(userId);
  }

  /**
   * GET /gamification/leaderboard — Top citizens by XP.
   */
  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.gamificationService.getLeaderboard(
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /**
   * GET /gamification/achievements — All achievements and user progress.
   */
  @Get('achievements')
  async getAchievements(@Req() req: any) {
    return this.gamificationService.getAchievementProgress(req.user.id);
  }

  /**
   * POST /gamification/xp — Award XP (internal / admin endpoint).
   */
  @Post('xp')
  async awardXP(
    @Req() req: any,
    @Body() body: { action: string; amount?: number; reason?: string; sourceId?: string },
  ) {
    return this.gamificationService.awardXP(req.user.id, body.action, {
      amount: body.amount,
      reason: body.reason,
      sourceId: body.sourceId,
    });
  }
}
