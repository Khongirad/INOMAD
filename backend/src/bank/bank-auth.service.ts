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
 * Bank Authentication Service.
 *
 * INSTITUTIONAL FIREWALL: This service verifies SeatSBT ownership
 * INDEPENDENTLY on-chain. It does NOT trust the Auth module's JWT
 * or any claims from the political authentication layer.
 *
 * Signing message is different from auth: "Bank of Siberia: ${nonce}"
 * to ensure separate signature per domain.
 */

export interface BankTicketPayload {
  bankRef: string;
  seatId: string;
  bankCode: string;
  jti: string;
}

@Injectable()
export class BankAuthService {
  private readonly logger = new Logger(BankAuthService.name);
  private readonly nonceTtlSeconds: number;
  private provider: ethers.JsonRpcProvider | null = null;
  private seatSBTContract: ethers.Contract | null = null;

  private readonly SEAT_SBT_ABI = [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  ];

  // Bank nonces stored separately with prefix to avoid collision with auth nonces
  private readonly BANK_NONCE_PREFIX = 'BANK:';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.nonceTtlSeconds = 300; // 5 minutes
    this.initializeChainClient();
  }

  /**
   * Bank's OWN blockchain client — independent from the global BlockchainService.
   * This ensures the bank module has no dependency on the auth/identity infrastructure.
   */
  private initializeChainClient() {
    const rpcUrl = this.configService.get<string>('ALTAN_RPC_URL');
    const seatSBTAddress = this.configService.get<string>('SEAT_SBT_ADDRESS');

    if (!rpcUrl || !seatSBTAddress) {
      this.logger.warn('Bank: Blockchain configuration incomplete. Running in offline mode.');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.seatSBTContract = new ethers.Contract(
        seatSBTAddress,
        this.SEAT_SBT_ABI,
        this.provider,
      );
      this.logger.log('Bank: Chain client initialized independently');
    } catch (error) {
      this.logger.error('Bank: Failed to initialize chain client', error);
    }
  }

  /**
   * Generate a bank-specific nonce.
   * Message format: "Bank of Siberia: ${nonce}" — different from auth.
   */
  async generateNonce(address: string): Promise<{ nonce: string; expiresAt: Date; message: string }> {
    const nonce = `${this.BANK_NONCE_PREFIX}${randomUUID()}`;
    const expiresAt = new Date(Date.now() + this.nonceTtlSeconds * 1000);

    await this.prisma.authNonce.create({
      data: {
        address: address.toLowerCase(),
        nonce,
        expiresAt,
      },
    });

    const message = `Bank of Siberia: ${nonce}`;
    return { nonce, expiresAt, message };
  }

  /**
   * Verify bank-specific signature and issue a bank ticket.
   *
   * 1. Validate bank nonce
   * 2. Verify signature of bank-specific message
   * 3. Verify SeatSBT ownership INDEPENDENTLY on-chain
   * 4. Resolve BankLink (opaque reference)
   * 5. Issue bank ticket JWT (separate secret)
   */
  async issueTicket(
    address: string,
    signature: string,
    nonce: string,
  ): Promise<{ bankTicket: string; expiresIn: number }> {
    // 1. Validate nonce (must be a bank nonce)
    if (!nonce.startsWith(this.BANK_NONCE_PREFIX)) {
      throw new UnauthorizedException('Invalid bank nonce format');
    }

    const nonceRecord = await this.prisma.authNonce.findUnique({ where: { nonce } });
    if (!nonceRecord) {
      throw new UnauthorizedException('Invalid bank nonce');
    }
    if (nonceRecord.consumed) {
      throw new UnauthorizedException('Bank nonce already used');
    }
    if (nonceRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Bank nonce expired');
    }
    if (nonceRecord.address !== address.toLowerCase()) {
      throw new UnauthorizedException('Bank nonce address mismatch');
    }

    // 2. Verify signature of bank-specific message
    const message = `Bank of Siberia: ${nonce}`;
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch {
      throw new UnauthorizedException('Invalid bank signature');
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new UnauthorizedException('Bank signature does not match address');
    }

    // 3. Mark nonce as consumed
    await this.prisma.authNonce.update({
      where: { nonce },
      data: { consumed: true },
    });

    // 4. Verify SeatSBT ownership INDEPENDENTLY on-chain
    const seatId = await this.verifySeatOwnership(address);
    if (!seatId) {
      throw new UnauthorizedException('No SeatSBT found for this address (bank verification)');
    }

    // 5. Resolve BankLink
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
      select: { id: true, bankLink: true },
    });

    if (!user || !user.bankLink) {
      throw new UnauthorizedException('No bank account linked to this identity');
    }

    if (user.bankLink.status !== 'ACTIVE') {
      throw new UnauthorizedException('Bank account is not active');
    }

    // 6. Issue bank ticket (SEPARATE JWT secret)
    const jti = randomUUID();
    const expiresIn = this.getTicketExpirySeconds();

    const payload: BankTicketPayload = {
      bankRef: user.bankLink.bankRef,
      seatId,
      bankCode: user.bankLink.bankCode,
      jti,
    };

    const bankTicket = this.jwtService.sign(payload, {
      expiresIn: `${expiresIn}s`,
    });

    // Log using bankRef only — NEVER userId
    this.logger.log(`Bank ticket issued for bankRef=${user.bankLink.bankRef.substring(0, 8)}...`);

    return { bankTicket, expiresIn };
  }

  /**
   * Validate a bank ticket payload.
   */
  validateTicket(payload: BankTicketPayload): BankTicketPayload {
    if (!payload.bankRef || !payload.seatId || !payload.bankCode) {
      throw new UnauthorizedException('Invalid bank ticket payload');
    }
    return payload;
  }

  /**
   * Independent SeatSBT ownership check.
   * Returns the primary seatId as string, or null if no seat found.
   */
  private async verifySeatOwnership(address: string): Promise<string | null> {
    if (!this.seatSBTContract) {
      this.logger.warn('Bank: Chain not available, cannot verify seat ownership');
      return null;
    }

    try {
      const balance = await this.seatSBTContract.balanceOf(address);
      if (Number(balance) === 0) return null;

      const tokenId = await this.seatSBTContract.tokenOfOwnerByIndex(address, 0);
      return tokenId.toString();
    } catch (error) {
      this.logger.error(`Bank: Failed to verify seat ownership for ${address}`, error);
      return null;
    }
  }

  private getTicketExpirySeconds(): number {
    const expiry = this.configService.get<string>('BANK_TICKET_EXPIRY') || '5m';
    const match = expiry.match(/^(\d+)(s|m|h)$/);
    if (!match) return 300;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      default: return 300;
    }
  }
}
