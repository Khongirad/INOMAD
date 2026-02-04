import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { TieredVerificationService } from './tiered-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { VerificationLevel } from '@prisma/client';

@Controller('verification')
@UseGuards(JwtAuthGuard)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly tieredVerificationService: TieredVerificationService,
  ) {}

  // ============ Legacy Verification Endpoints ============
  @Get('pending')
  async getPendingUsers() {
    return this.verificationService.getPendingUsers();
  }

  @Post('verify/:userId')
  async verifyUser(
    @Param('userId') userId: string,
    @Request() req,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Body() body: { notes?: string; location?: string },
  ) {
    return this.verificationService.verifyUser(
      req.user.sub,
      userId,
      ipAddress,
      userAgent,
      body.notes,
      body.location,
    );
  }

  @Get('chain/:userId')
  async getVerificationChain(@Param('userId') userId: string) {
    return this.verificationService.getVerificationChain(userId);
  }

  @Get('stats')
  async getMyStats(@Request() req) {
    return this.verificationService.getVerifierStats(req.user.sub);
  }

  @Post('revoke/:verificationId')
  @UseGuards(AdminGuard)
  async revokeVerification(
    @Param('verificationId') verificationId: string,
    @Request() req,
    @Body() body: { reason: string },
  ) {
    return this.verificationService.revokeVerification(
      verificationId,
      req.user.sub,
      body.reason,
    );
  }

  // ============ Tiered Verification Endpoints (NEW) ============
  
  /**
   * Get user's emission status (limit, used, remaining)
   */
  @Get('emission/status')
  async getEmissionStatus(@Request() req) {
    return this.tieredVerificationService.getEmissionStatus(req.user.sub);
  }

  /**
   * Request verification level upgrade (Zun or Full)
   */
  @Post('request-upgrade')
  async requestUpgrade(
    @Request() req,
    @Body() body: {
      requestedLevel: VerificationLevel;
      justification: string;
      supportingDocuments?: any[];
    },
  ) {
    return this.tieredVerificationService.requestVerificationUpgrade(
      req.user.sub,
      body.requestedLevel,
      body.justification,
      body.supportingDocuments,
    );
  }

  /**
   * Get my verification requests
   */
  @Get('my-requests')
  async getMyRequests(@Request() req) {
    return this.tieredVerificationService.getMyRequests(req.user.sub);
  }

  /**
   * Admin: Get pending verification requests
   */
  @Get('admin/pending-requests')
  @UseGuards(AdminGuard)
  async getPendingRequests() {
    return this.tieredVerificationService.getPendingRequests();
  }

  /**
   * Admin: Review verification request
   */
  @Post('admin/review/:requestId')
  @UseGuards(AdminGuard)
  async reviewRequest(
    @Param('requestId') requestId: string,
    @Request() req,
    @Body() body: { approved: boolean; notes?: string },
  ) {
    return this.tieredVerificationService.reviewVerificationRequest(
      requestId,
      req.user.sub,
      body.approved,
      body.notes,
    );
  }

  /**
   * Creator Only: Manually set verification level
   */
  @Post('admin/set-level/:userId')
  @UseGuards(AdminGuard)
  async setVerificationLevel(
    @Param('userId') userId: string,
    @Request() req,
    @Body() body: { level: VerificationLevel },
  ) {
    return this.tieredVerificationService.setVerificationLevel(
      userId,
      body.level,
      req.user.sub,
    );
  }
}
