import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';
import { randomUUID } from 'crypto';

/**
 * Central Bank Authentication Service.
 *
 * INSTITUTIONAL FIREWALL: This service verifies CB contract ownership
 * INDEPENDENTLY on-chain. It does NOT trust the Auth module or Bank module.
 *
 * Signing message: "Central Bank of Siberia: ${nonce}"
 * Separate from auth ("Sign in to INOMAD: ...") and bank ("Bank of Siberia: ...")
 */

export interface CBTicketPayload {
  officerId: string;
  walletAddress: string;
  role: 'GOVERNOR' | 'BOARD_MEMBER';
  jti: string;
}

interface StoredNonce {
  nonce: string;
  address: string;
  expiresAt: Date;
  consumed: boolean;
}

@Injectable()
export class CentralBankAuthService {
  private readonly logger = new Logger(CentralBankAuthService.name);
  private readonly nonceTtlSeconds = 300; // 5 minutes
  private readonly CB_NONCE_PREFIX = 'CB:';

  // In-memory nonce store (production: use Redis)
  private nonceStore = new Map<string, StoredNonce>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.validateSecretSeparation();
  }

  /**
   * Validate that CB_JWT_SECRET is configured and distinct from other secrets.
   */
  private validateSecretSeparation() {
    const cbSecret = this.configService.get<string>('CB_JWT_SECRET');
    const bankSecret = this.configService.get<string>('BANK_JWT_SECRET');
    const authSecret = this.configService.get<string>('AUTH_JWT_SECRET');

    if (!cbSecret) {
      this.logger.warn('CB_JWT_SECRET is not configured. Using fallback for development.');
    }

    if (cbSecret && (cbSecret === bankSecret || cbSecret === authSecret)) {
      this.logger.error(
        'CB_JWT_SECRET must differ from BANK_JWT_SECRET and AUTH_JWT_SECRET! ' +
        'This violates institutional firewall between Central Bank and other layers.',
      );
    }
  }

  /**
   * Generate a Central Bank-specific nonce for wallet signature.
   */
  async generateNonce(address: string): Promise<{ nonce: string; expiresAt: Date; message: string }> {
    if (!address || !ethers.isAddress(address)) {
      throw new UnauthorizedException('Invalid wallet address');
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = `${this.CB_NONCE_PREFIX}${randomUUID()}`;
    const expiresAt = new Date(Date.now() + this.nonceTtlSeconds * 1000);
    const message = `Central Bank of Siberia: ${nonce}`;

    this.nonceStore.set(nonce, {
      nonce,
      address: normalizedAddress,
      expiresAt,
      consumed: false,
    });

    // Cleanup expired nonces periodically
    this.cleanupExpiredNonces();

    return { nonce, expiresAt, message };
  }

  /**
   * Verify signature and issue a CB ticket.
   */
  async issueTicket(
    address: string,
    signature: string,
    nonce: string,
  ): Promise<{ cbTicket: string; expiresIn: number }> {
    const normalizedAddress = address.toLowerCase();

    // 1. Validate nonce
    if (!nonce.startsWith(this.CB_NONCE_PREFIX)) {
      throw new UnauthorizedException('Invalid nonce format');
    }

    const storedNonce = this.nonceStore.get(nonce);
    if (!storedNonce) {
      throw new UnauthorizedException('Nonce not found or already consumed');
    }
    if (storedNonce.consumed) {
      throw new UnauthorizedException('Nonce already consumed');
    }
    if (storedNonce.expiresAt < new Date()) {
      this.nonceStore.delete(nonce);
      throw new UnauthorizedException('Nonce expired');
    }
    if (storedNonce.address !== normalizedAddress) {
      throw new UnauthorizedException('Address mismatch');
    }

    // 2. Verify signature
    const message = `Central Bank of Siberia: ${nonce}`;
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
      throw new UnauthorizedException('Invalid signature');
    }

    if (recoveredAddress !== normalizedAddress) {
      throw new UnauthorizedException('Signature does not match address');
    }

    // 3. Mark nonce as consumed
    storedNonce.consumed = true;

    // 4. Verify this address is a registered CB officer
    const officer = await this.prisma.centralBankOfficer.findUnique({
      where: { walletAddress: normalizedAddress },
    });

    if (!officer || !officer.isActive) {
      throw new UnauthorizedException('Address is not a registered Central Bank officer');
    }

    // 5. Issue CB ticket
    const cbSecret = this.configService.get<string>('CB_JWT_SECRET') || 'dev-cb-secret-change-me';
    const expiresIn = 900; // 15 minutes

    const payload: CBTicketPayload = {
      officerId: officer.id,
      walletAddress: normalizedAddress,
      role: officer.role,
      jti: randomUUID(),
    };

    const cbTicket = this.jwtService.sign(payload, {
      secret: cbSecret,
      expiresIn: `${expiresIn}s`,
    });

    this.logger.log(`CB ticket issued for officer ${officer.role} (${normalizedAddress.substring(0, 10)}...)`);

    return { cbTicket, expiresIn };
  }

  /**
   * Validate CB ticket payload structure.
   */
  validateTicket(payload: CBTicketPayload): CBTicketPayload {
    if (!payload.officerId || !payload.walletAddress || !payload.role) {
      throw new UnauthorizedException('Invalid CB ticket structure');
    }
    if (!['GOVERNOR', 'BOARD_MEMBER'].includes(payload.role)) {
      throw new UnauthorizedException('Invalid CB officer role in ticket');
    }
    return payload;
  }

  private cleanupExpiredNonces() {
    const now = new Date();
    for (const [key, value] of this.nonceStore.entries()) {
      if (value.expiresAt < now || value.consumed) {
        this.nonceStore.delete(key);
      }
    }
  }
}
