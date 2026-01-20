import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { VerificationService } from './verification.service';

@Controller('identity')
export class IdentityController {
  constructor(
    private registrationService: RegistrationService,
    private verificationService: VerificationService
  ) {}

  @Post('register')
  async register(@Body() data: any) {
    const user = await this.registrationService.initiateRegistration(data);
    const allocation = await this.registrationService.assignTerritory(user.id, data.birthPlace.district || data.birthPlace.city);
    
    // Fetch updated user to get seatId
    const updatedUser = await this.registrationService.getUpdatedUser(user.id);
    return { user: updatedUser, allocation };
  }

  @Get('status/:userId')
  async getStatus(@Param('userId') userId: string) {
    return this.verificationService.getVerificationStatus(userId);
  }

  @Post('verify')
  async verify(@Request() req: any, @Body() body: { targetUserId: string }) {
    const verifierSeatId = req.user?.seatId;
    return this.verificationService.submitVerification(verifierSeatId, body.targetUserId);
  }

  @Post('super-verify')
  async superVerify(@Request() req: any, @Body() body: { targetUserId: string; justification: string }) {
    const mandateSeatId = req.user?.seatId;
    return this.verificationService.superVerify(mandateSeatId, body.targetUserId, body.justification);
  }
}
