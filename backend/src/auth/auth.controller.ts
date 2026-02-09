import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPasswordService } from './auth-password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { Public } from './decorators/public.decorator';
import { RequestNonceDto, VerifySignatureDto, RefreshTokenDto } from './dto/auth.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authPasswordService: AuthPasswordService,
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
    const result = await this.authService.generateNonce(dto.address);
    return result;
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
      dto.address,
      dto.signature,
      dto.nonce,
      req.ip,
      req.headers['user-agent'],
    );
    return { ok: true, ...result };
  }

  /**
   * GET /auth/me
   * Return current user identity — NO financial data.
   * Requires valid JWT.
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
   * Public endpoint (uses refresh token in body).
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const result = await this.authService.refreshTokens(
      dto.refreshToken,
      req.ip,
      req.headers['user-agent'],
    );
    return { ok: true, ...result };
  }

  /**
   * POST /auth/logout
   * Revoke current session.
   * Requires valid JWT.
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest) {
    // Extract jti from the token
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      await this.authService.logout(decoded.jti);
    }
    return { ok: true };
  }

  /**
   * POST /auth/logout-all
   * Revoke all sessions for current user.
   * Requires valid JWT.
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
   * Register new user with username and password
   * Gates of Khural entrance - step 1
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: { username: string; password: string; email?: string }) {
    return this.authPasswordService.register(dto);
  }

  /**
   * POST /auth/login-password
   * Login with username and password
   * Gates of Khural entrance
   */
  @Public()
  @Post('login-password')
  @HttpCode(HttpStatus.OK)
  async loginPassword(@Body() dto: { username: string; password: string }) {
    return this.authPasswordService.login(dto);
  }

  /**
   * POST /auth/accept-tos
   * Accept Terms of Service
   * Required before constitution acceptance
   */
  @Post('accept-tos')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptTOS(@Req() req: AuthenticatedRequest) {
    return this.authPasswordService.acceptTOS(req.user.userId);
  }

  /**
   * POST /auth/accept-constitution
   * Accept INOMAD KHURAL Constitution
   * USER BECOMES LEGAL SUBJECT - gains rights and responsibilities
   */
  @Post('accept-constitution')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptConstitution(@Req() req: AuthenticatedRequest) {
    return this.authPasswordService.acceptConstitution(req.user.userId);
  }

  /**
   * POST /auth/change-password
   * Change user password
   */
  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: { oldPassword: string; newPassword: string },
  ) {
    return this.authPasswordService.changePassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }
}
