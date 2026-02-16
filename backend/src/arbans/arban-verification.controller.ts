import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ArbanVerificationService } from './arban-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Arbans')
@Controller('arbans')
@UseGuards(JwtAuthGuard)
export class ArbanVerificationController {
  constructor(
    private readonly arbanVerificationService: ArbanVerificationService,
  ) {}

  /**
   * Verify a member in your Arban
   */
  @Post(':arbanId/verify-member')
  async verifyMember(
    @Param('arbanId') arbanId: string,
    @Request() req,
    @Body() body: { memberId: string; notes?: string },
  ) {
    return this.arbanVerificationService.verifyMember(
      arbanId,
      req.user.sub,
      body.memberId,
      body.notes,
    );
  }

  /**
   * Get verification matrix (who verified whom)
   */
  @Get(':arbanId/verification-matrix')
  async getVerificationMatrix(@Param('arbanId') arbanId: string) {
    return this.arbanVerificationService.getVerificationMatrix(arbanId);
  }

  /**
   * Get verification progress for Arban
   */
  @Get(':arbanId/verification-progress')
  async getVerificationProgress(@Param('arbanId') arbanId: string) {
    return this.arbanVerificationService.getVerificationProgress(arbanId);
  }

  /**
   * Check if Arban is fully verified
   */
  @Get(':arbanId/is-fully-verified')
  async isFullyVerified(@Param('arbanId') arbanId: string) {
    const isComplete = await this.arbanVerificationService.isFullyVerified(arbanId);
    return { isFullyVerified: isComplete };
  }

  /**
   * Get list of members user hasn't verified yet
   */
  @Get(':arbanId/unverified-members')
  async getUnverifiedMembers(
    @Param('arbanId') arbanId: string,
    @Request() req,
  ) {
    return this.arbanVerificationService.getUnverifiedMembers(
      arbanId,
      req.user.sub,
    );
  }

  /**
   * Get verification details for a specific member
   */
  @Get(':arbanId/member/:memberId/verifications')
  async getMemberVerifications(
    @Param('arbanId') arbanId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.arbanVerificationService.getMemberVerifications(arbanId, memberId);
  }

  /**
   * Revoke a verification (self or admin)
   */
  @Delete(':arbanId/verify-member/:verifiedId')
  async revokeVerification(
    @Param('arbanId') arbanId: string,
    @Param('verifiedId') verifiedId: string,
    @Request() req,
    @Body() body: { reason?: string },
  ) {
    return this.arbanVerificationService.revokeVerification(
      arbanId,
      req.user.sub,
      verifiedId,
      req.user.sub,
      body.reason,
    );
  }
}
