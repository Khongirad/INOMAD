import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPasswordService } from './auth-password.service';
import { AccountRecoveryService, SECRET_QUESTIONS } from './account-recovery.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { Public } from './decorators/public.decorator';
import {
  RequestNonceDto,
  VerifySignatureDto,
  RefreshTokenDto,
  RegisterDto,
  LoginPasswordDto,
  ChangePasswordDto,
  SetSecretQuestionDto,
  RecoveryViaGuarantorDto,
  RecoveryViaSecretQuestionDto,
  RecoveryViaOfficialDto,
  ResetPasswordViaTokenDto,
  OfficialApproveDto,
} from './dto/auth.dto';
import { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authPasswordService: AuthPasswordService,
    private readonly accountRecoveryService: AccountRecoveryService,
  ) {}

  /**
   * POST /auth/nonce
   * Generate a nonce challenge for wallet signature.
   * Public endpoint — no auth required.
   */
  @Public()
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  async requestNonce(@Body() dto: RequestNonceDto) {
    return this.authService.generateNonce(dto.address);
  }

  /**
   * POST /auth/verify
   * Verify wallet signature, check SeatSBT ownership, issue JWT.
   * Public endpoint — no auth required.
   */
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifySignatureDto, @Req() req: Request) {
    const result = await this.authService.verifySignature(
      dto.address, dto.signature, dto.nonce, req.ip, req.headers['user-agent'],
    );
    return { ok: true, ...result };
  }

  /**
   * GET /auth/me
   * Return current user identity — NO financial data.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: AuthenticatedRequest) {
    const me = await this.authService.getMe(req.user.userId);
    return { ok: true, me };
  }

  /**
   * POST /auth/refresh
   * Rotate access + refresh tokens.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const result = await this.authService.refreshTokens(
      dto.refreshToken, req.ip, req.headers['user-agent'],
    );
    return { ok: true, ...result };
  }

  /**
   * POST /auth/logout
   * Revoke current session.
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      await this.authService.logout(decoded.jti);
    }
    return { ok: true };
  }

  /**
   * POST /auth/logout-all
   * Revoke all sessions for current user.
   */
  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: AuthenticatedRequest) {
    await this.authService.logoutAll(req.user.userId);
    return { ok: true };
  }

  // ========================================
  // GATES OF KHURAL - Password-Based Auth
  // ========================================

  /**
   * POST /auth/register
   * Register new user — Gates of Khural entrance step 1
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authPasswordService.register(dto);
  }

  /**
   * POST /auth/login-password
   * Login with username and password
   */
  @Public()
  @Post('login-password')
  @HttpCode(HttpStatus.OK)
  async loginPassword(@Body() dto: LoginPasswordDto) {
    return this.authPasswordService.login(dto);
  }

  /**
   * POST /auth/accept-tos
   * Accept Terms of Service
   */
  @Post('accept-tos')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptTOS(@Req() req: AuthenticatedRequest) {
    return this.authPasswordService.acceptTOS(req.user.userId);
  }

  /**
   * POST /auth/accept-constitution
   * Accept Constitution — USER BECOMES LEGAL SUBJECT
   */
  @Post('accept-constitution')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptConstitution(@Req() req: AuthenticatedRequest) {
    return this.authPasswordService.acceptConstitution(req.user.userId);
  }

  /**
   * POST /auth/change-password
   * Change user password (requires old password)
   */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authPasswordService.changePassword(
      req.user.userId, dto.oldPassword, dto.newPassword,
    );
  }

  // ========================================
  // ACCOUNT RECOVERY — Chain of Trust
  // No email reset. Recovery through people you know.
  // ========================================

  /**
   * GET /auth/recovery/questions
   * List available secret questions
   */
  @Public()
  @Get('recovery/questions')
  getSecretQuestions() {
    return { ok: true, questions: SECRET_QUESTIONS };
  }

  /**
   * POST /auth/set-secret-question
   * Set secret question+answer (Path 2.1 setup)
   * Best done during profile creation
   */
  @Post('set-secret-question')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async setSecretQuestion(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetSecretQuestionDto,
  ) {
    return this.accountRecoveryService.setSecretQuestion(
      req.user.userId, dto.question, dto.answer,
    );
  }

  /**
   * POST /auth/recovery/via-guarantor
   * Path A: Request recovery via original guarantor
   */
  @Public()
  @Post('recovery/via-guarantor')
  @HttpCode(HttpStatus.CREATED)
  async recoveryViaGuarantor(@Body() dto: RecoveryViaGuarantorDto) {
    return this.accountRecoveryService.requestViaGuarantor(dto);
  }

  /**
   * POST /auth/recovery/via-secret-question
   * Path 2.1: Recover using pre-set secret question
   */
  @Public()
  @Post('recovery/via-secret-question')
  @HttpCode(HttpStatus.OK)
  async recoveryViaSecretQuestion(@Body() dto: RecoveryViaSecretQuestionDto) {
    return this.accountRecoveryService.requestViaSecretQuestion(dto);
  }

  /**
   * POST /auth/recovery/via-official
   * Path 2.2: Submit to Migration Service or Council
   */
  @Public()
  @Post('recovery/via-official')
  @HttpCode(HttpStatus.CREATED)
  async recoveryViaOfficial(@Body() dto: RecoveryViaOfficialDto) {
    return this.accountRecoveryService.requestViaOfficialOrgans(dto);
  }

  /**
   * POST /auth/recovery/:id/guarantor-confirm
   * Guarantor confirms the recovery identity claim
   * Requires JWT — guarantor must be logged in
   */
  @Post('recovery/:id/guarantor-confirm')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async guarantorConfirm(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
  ) {
    return this.accountRecoveryService.confirmAsGuarantor(req.user.userId, requestId);
  }

  /**
   * GET /auth/recovery/:id
   * Get recovery request details (for guarantor / admin)
   */
  @Get('recovery/:id')
  @UseGuards(AuthGuard)
  async getRecoveryRequest(@Param('id') requestId: string) {
    const request = await this.accountRecoveryService.getRecoveryRequest(requestId);
    return { ok: true, request };
  }

  /**
   * POST /auth/recovery/:id/official-approve
   * Admin/official officer approves Path 2.2 request
   */
  @Post('recovery/:id/official-approve')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async officialApprove(
    @Req() req: AuthenticatedRequest,
    @Param('id') requestId: string,
    @Body() dto: OfficialApproveDto,
  ) {
    return this.accountRecoveryService.officialApprove(
      req.user.userId, requestId, dto.approved, dto.note,
    );
  }

  /**
   * GET /auth/recovery/pending/list
   * Admin: list pending recovery requests
   */
  @Get('recovery/pending/list')
  @UseGuards(AuthGuard)
  async getPendingRecoveries(
    @Query('method') method?: 'GUARANTOR' | 'SECRET_QUESTION' | 'OFFICIAL_ORGANS',
  ) {
    const requests = await this.accountRecoveryService.getPendingRequests(method);
    return { ok: true, requests };
  }

  /**
   * POST /auth/recovery/reset-password
   * Use a recovery token to set a new password (public)
   */
  @Public()
  @Post('recovery/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPasswordViaToken(@Body() dto: ResetPasswordViaTokenDto) {
    return this.accountRecoveryService.resetPasswordWithToken(
      dto.recoveryToken, dto.newPassword,
    );
  }
}
