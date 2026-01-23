import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ethers } from 'ethers';
import { randomUUID } from 'crypto';

interface JwtPayload {
  sub: string; // userId
  seatId: string;
  address: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly nonceTtlSeconds: number;
  private readonly refreshExpiry: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private blockchainService: BlockchainService,
  ) {
    this.nonceTtlSeconds = this.configService.get<number>('AUTH_NONCE_TTL_SECONDS') || 300;
    this.refreshExpiry = this.configService.get<string>('AUTH_REFRESH_EXPIRY') || '24h';
  }

  /**
   * Generate a nonce challenge for wallet signature verification.
   */
  async generateNonce(address: string): Promise<{ nonce: string; expiresAt: Date; message: string }> {
    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + this.nonceTtlSeconds * 1000);

    await this.prisma.authNonce.create({
      data: {
        address: address.toLowerCase(),
        nonce,
        expiresAt,
      },
    });

    const message = `Sign in to INOMAD: ${nonce}`;

    return { nonce, expiresAt, message };
  }

  /**
   * Verify a wallet signature and issue JWT tokens.
   * 1. Validate nonce (not expired, not consumed)
   * 2. Recover signer from signature
   * 3. Verify SeatSBT ownership on-chain
   * 4. Find/create user binding
   * 5. Issue access + refresh tokens
   */
  async verifySignature(
    address: string,
    signature: string,
    nonce: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // 1. Validate nonce
    const nonceRecord = await this.prisma.authNonce.findUnique({ where: { nonce } });

    if (!nonceRecord) {
      throw new UnauthorizedException('Invalid nonce');
    }
    if (nonceRecord.consumed) {
      throw new UnauthorizedException('Nonce already used');
    }
    if (nonceRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Nonce expired');
    }
    if (nonceRecord.address !== address.toLowerCase()) {
      throw new UnauthorizedException('Nonce address mismatch');
    }

    // 2. Recover signer from signature
    const message = `Sign in to INOMAD: ${nonce}`;
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch {
      throw new UnauthorizedException('Invalid signature');
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new UnauthorizedException('Signature does not match address');
    }

    // 3. Mark nonce as consumed
    await this.prisma.authNonce.update({
      where: { nonce },
      data: { consumed: true },
    });

    // 4. Verify SeatSBT ownership on-chain
    const seatIds = await this.blockchainService.getSeatsOwnedBy(address);
    if (seatIds.length === 0) {
      throw new UnauthorizedException('No SeatSBT found for this address');
    }
    const primarySeatId = seatIds[0];

    // 5. Find or bind user
    let user = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });

    if (!user) {
      // Try to find by seatId and bind wallet
      user = await this.prisma.user.findUnique({
        where: { seatId: primarySeatId },
      });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { walletAddress: address.toLowerCase() },
        });
      }
    }

    if (!user) {
      throw new UnauthorizedException('No user record found for this SeatSBT. Register first.');
    }

    // 6. Issue tokens
    const jti = randomUUID();
    const refreshToken = randomUUID();
    const expiresIn = this.getExpirySeconds();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const payload: JwtPayload = {
      sub: user.id,
      seatId: user.seatId,
      address: address.toLowerCase(),
      jti,
    };

    const accessToken = this.jwtService.sign(payload);

    // 7. Create session record
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        jti,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    this.logger.log(`Auth: user ${user.seatId} authenticated`);

    return { accessToken, refreshToken, expiresIn };
  }

  /**
   * Get current user identity (NO financial data).
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        seatId: true,
        walletAddress: true,
        role: true,
        verificationStatus: true,
        walletStatus: true,
        bankLink: {
          select: {
            bankCode: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      seatId: user.seatId,
      address: user.walletAddress,
      roles: [user.role.toLowerCase()],
      status: user.verificationStatus,
      walletStatus: user.walletStatus,
      hasBankLink: !!user.bankLink,
      bankCode: user.bankLink?.bankCode || null,
    };
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const session = await this.prisma.authSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old session
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Issue new tokens
    const jti = randomUUID();
    const newRefreshToken = randomUUID();
    const expiresIn = this.getExpirySeconds();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const payload: JwtPayload = {
      sub: session.user.id,
      seatId: session.user.seatId,
      address: session.user.walletAddress || '',
      jti,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.prisma.authSession.create({
      data: {
        userId: session.user.id,
        jti,
        refreshToken: newRefreshToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  }

  /**
   * Revoke current session.
   */
  async logout(jti: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { jti, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all sessions for a user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  /**
   * Validate a JWT payload (called by guard).
   * Checks that the session is still active.
   */
  async validateSession(payload: JwtPayload): Promise<{ userId: string; seatId: string; address: string }> {
    const session = await this.prisma.authSession.findUnique({
      where: { jti: payload.jti },
    });

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session revoked');
    }

    // Update last used
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: payload.sub,
      seatId: payload.seatId,
      address: payload.address,
    };
  }

  private getExpirySeconds(): number {
    const expiry = this.configService.get<string>('AUTH_JWT_EXPIRY') || '15m';
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}
