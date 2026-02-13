import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CitizenshipService } from './citizenship.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('citizenship')
@UseGuards(AuthGuard)
export class CitizenshipController {
  constructor(private readonly citizenshipService: CitizenshipService) {}

  // ===========================
  //  EXCLUSIVE LAND RIGHT
  // ===========================

  /** Grant initial exclusive right (admin only) */
  @Post('exclusive-right/grant')
  grantInitialRight(@Req() req: any, @Body() body: { userId: string }) {
    return this.citizenshipService.grantInitialRight(body.userId, req.user.userId);
  }

  /** Inherit right from father to son */
  @Post('exclusive-right/inherit')
  inheritRight(@Body() body: { fatherId: string; sonId: string }) {
    return this.citizenshipService.inheritRight(body.fatherId, body.sonId);
  }

  /** Revert right to State Land Fund (no male heir) */
  @Post('exclusive-right/revert')
  revertToFund(@Body() body: { userId: string; reason: string }) {
    return this.citizenshipService.revertToFund(body.userId, body.reason);
  }

  /** Get right transfer history */
  @Get('exclusive-right/history/:userId')
  getRightHistory(@Param('userId') userId: string) {
    return this.citizenshipService.getRightHistory(userId);
  }

  // ===========================
  //  KHURAL DELEGATION
  // ===========================

  /** Delegate Khural seat to spouse */
  @Post('khural/delegate')
  delegateKhuralSeat(@Req() req: any, @Body() body: { spouseId: string }) {
    return this.citizenshipService.delegateKhuralSeat(req.user.userId, body.spouseId);
  }

  /** Revoke delegation (represent yourself) */
  @Post('khural/delegate/revoke')
  revokeKhuralDelegation(@Req() req: any) {
    return this.citizenshipService.revokeKhuralDelegation(req.user.userId);
  }

  // ===========================
  //  CITIZENSHIP ADMISSION
  // ===========================

  /** Apply for citizenship (RESIDENT → CITIZEN) */
  @Post('admission/apply')
  applyForCitizenship(@Req() req: any) {
    return this.citizenshipService.applyForCitizenship(req.user.userId);
  }

  /** Vote on admission (INDIGENOUS only) */
  @Post('admission/:id/vote')
  voteOnAdmission(
    @Param('id') admissionId: string,
    @Req() req: any,
    @Body() body: { vote: 'FOR' | 'AGAINST'; comment?: string },
  ) {
    return this.citizenshipService.voteOnAdmission(
      admissionId,
      req.user.userId,
      body.vote,
      body.comment,
    );
  }

  /** List pending admissions */
  @Get('admissions/pending')
  listPendingAdmissions() {
    return this.citizenshipService.listPendingAdmissions();
  }

  // ===========================
  //  ELIGIBILITY CHECKS
  // ===========================

  /** Check legislative eligibility */
  @Get('eligibility/legislative/:userId')
  async checkLegislativeEligibility(@Param('userId') userId: string) {
    const eligible = await this.citizenshipService.canParticipateInLegislature(userId);
    return { userId, canParticipateInLegislature: eligible };
  }

  /** Check government eligibility */
  @Get('eligibility/government/:userId')
  async checkGovernmentEligibility(@Param('userId') userId: string) {
    const eligible = await this.citizenshipService.canParticipateInGovernment(userId);
    return { userId, canParticipateInGovernment: eligible };
  }
}
