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
import { ArbadVerificationService } from './arbad-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Arbads')
@Controller('arbads')
@UseGuards(JwtAuthGuard)
export class ArbadVerificationController {
  constructor(
    private readonly arbadVerificationService: ArbadVerificationService,
  ) {}

  /**
   * Verify a member in your Arbad
   */
  @Post(':arbadId/verify-member')
  async verifyMember(
    @Param('arbadId') arbadId: string,
    @Request() req,
    @Body() body: { memberId: string; notes?: string },
  ) {
    return this.arbadVerificationService.verifyMember(
      arbadId,
      req.user.sub,
      body.memberId,
      body.notes,
    );
  }

  /**
   * Get verification matrix (who verified whom)
   */
  @Get(':arbadId/verification-matrix')
  async getVerificationMatrix(@Param('arbadId') arbadId: string) {
    return this.arbadVerificationService.getVerificationMatrix(arbadId);
  }

  /**
   * Get verification progress for Arbad
   */
  @Get(':arbadId/verification-progress')
  async getVerificationProgress(@Param('arbadId') arbadId: string) {
    return this.arbadVerificationService.getVerificationProgress(arbadId);
  }

  /**
   * Check if Arbad is fully verified
   */
  @Get(':arbadId/is-fully-verified')
  async isFullyVerified(@Param('arbadId') arbadId: string) {
    const isComplete = await this.arbadVerificationService.isFullyVerified(arbadId);
    return { isFullyVerified: isComplete };
  }

  /**
   * Get list of members user hasn't verified yet
   */
  @Get(':arbadId/unverified-members')
  async getUnverifiedMembers(
    @Param('arbadId') arbadId: string,
    @Request() req,
  ) {
    return this.arbadVerificationService.getUnverifiedMembers(
      arbadId,
      req.user.sub,
    );
  }

  /**
   * Get verification details for a specific member
   */
  @Get(':arbadId/member/:memberId/verifications')
  async getMemberVerifications(
    @Param('arbadId') arbadId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.arbadVerificationService.getMemberVerifications(arbadId, memberId);
  }

  /**
   * Revoke a verification (self or admin)
   */
  @Delete(':arbadId/verify-member/:verifiedId')
  async revokeVerification(
    @Param('arbadId') arbadId: string,
    @Param('verifiedId') verifiedId: string,
    @Request() req,
    @Body() body: { reason?: string },
  ) {
    return this.arbadVerificationService.revokeVerification(
      arbadId,
      req.user.sub,
      verifiedId,
      req.user.sub,
      body.reason,
    );
  }
}
