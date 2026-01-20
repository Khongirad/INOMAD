import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';

@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    return this.identityService.getStatus(userId);
  }

  @Post('unlock/request')
  async requestUnlock(@Body() body: { userId: string }) {
    return this.identityService.requestUnlock(body.userId);
  }

  @Post('unlock/approve')
  async approveUnlock(@Body() body: { approverId: string; targetUserId: string }) {
    return this.identityService.approveUnlock(body.approverId, body.targetUserId);
  }

  @Post('unlock/finalize')
  async finalizeUnlock(@Body() body: { userId: string }) {
    return this.identityService.finalizeUnlock(body.userId);
  }
}
