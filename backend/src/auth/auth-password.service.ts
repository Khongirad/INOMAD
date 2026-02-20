import { Injectable, Optional, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { generateBiometricHash } from './account-recovery.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class AuthPasswordService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Optional() private readonly blockchain?: BlockchainService,
  ) {}

  /**
   * Register a new user with username and password
   * Gates of Khural registration flow
   */
  async register(dto: {
    username: string;
    password: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    ethnicity?: string[];
    birthPlace?: Record<string, any>;
    clan?: string;
    nationality?: string;
    fullName?: string;       // Legal name for anti-duplicate check
    birthCity?: string;     // City of birth for biometric hash
  }) {
    // Validate username
    if (!dto.username || dto.username.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters long');
    }

    // Validate password policy
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Check password complexity: must contain letters and numbers
    const hasLetters = /[a-zA-Z]/.test(dto.password);
    const hasNumbers = /[0-9]/.test(dto.password);
    
    if (!hasLetters || !hasNumbers) {
      throw new BadRequestException('Password must contain both letters and numbers');
    }

    // Check if username already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already taken');
    }

    // Check email if provided
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Anti-duplicate biometric check: if fullName + dateOfBirth + birthCity are all provided,
    // compute a privacy-safe hash and verify no other account matches this identity
    let biometricIdentityHash: string | undefined;
    if (dto.fullName && dto.dateOfBirth && dto.birthCity) {
      biometricIdentityHash = generateBiometricHash(dto.fullName, dto.dateOfBirth, dto.birthCity);
      const existingBiometric = await this.prisma.user.findUnique({
        where: { biometricIdentityHash },
        select: { id: true },
      });
      if (existingBiometric) {
        throw new ConflictException(
          'An account with this identity already exists. One person may only hold one legal digital shell.',
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate unique SeatID with blockchain entropy
    const seatId = await this.generateSeatId(dto.username);

    // Generate random 13-digit citizen number (non-sequential for privacy)
    let citizenNumber: string;
    let isUnique = false;
    while (!isUnique) {
      // Random number between 2 and 9999999999999 (Creator has #1)
      const num = Math.floor(Math.random() * 9999999999998) + 2;
      citizenNumber = String(num).padStart(13, '0');
      const existing = await this.prisma.user.findUnique({
        where: { citizenNumber },
        select: { id: true },
      });
      if (!existing) isUnique = true;
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        seatId,
        citizenNumber,
        username: dto.username,
        passwordHash,
        email: dto.email,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        birthPlace: dto.birthPlace,
        clan: dto.clan,
        nationality: dto.nationality,
        role: 'CITIZEN',
        verificationStatus: 'DRAFT',
        walletStatus: 'LOCKED',
        ethnicity: dto.ethnicity || [],
        hasAcceptedTOS: false,
        hasAcceptedConstitution: false,
        isLegalSubject: false,
      },
    });

    // Generate JWT tokens
    const tokens = await this.generateTokens(user.id, user.seatId, user.role);

    return {
      ok: true,
      user: {
        userId: user.id,
        seatId: user.seatId,
        citizenNumber: user.citizenNumber,
        username: user.username,
        role: user.role,
        status: user.verificationStatus,
        walletStatus: user.walletStatus,
        hasAcceptedTOS: user.hasAcceptedTOS,
        hasAcceptedConstitution: user.hasAcceptedConstitution,
        isLegalSubject: user.isLegalSubject,
      },
      ...tokens,
    };
  }

  /**
   * Login with username and password
   * Gates of Khural entrance
   */
  async login(dto: {
    username: string;
    password: string;
  }) {
    // Find user by username
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is frozen (for admins)
    if (user.isFrozen) {
      throw new UnauthorizedException('Account is frozen. Contact the Creator.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT tokens
    const tokens = await this.generateTokens(user.id, user.seatId, user.role);

    return {
      ok: true,
      user: {
        userId: user.id,
        seatId: user.seatId,
        citizenNumber: user.citizenNumber,
        username: user.username,
        address: user.walletAddress,
        role: user.role,
        roles: [user.role],
        status: user.verificationStatus,
        walletStatus: user.walletStatus,
        hasAcceptedTOS: user.hasAcceptedTOS,
        hasAcceptedConstitution: user.hasAcceptedConstitution,
        isLegalSubject: user.isLegalSubject,
        hasBankLink: false,
        bankCode: null,
      },
      ...tokens,
    };
  }

  /**
   * Accept Terms of Service
   */
  async acceptTOS(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasAcceptedTOS: true,
        tosAcceptedAt: new Date(),
      },
    });

    return {
      ok: true,
      hasAcceptedTOS: user.hasAcceptedTOS,
      tosAcceptedAt: user.tosAcceptedAt,
    };
  }

  /**
   * Accept Constitution - User becomes legal subject
   * This is the key transformation moment!
   */
  async acceptConstitution(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasAcceptedConstitution: true,
        constitutionAcceptedAt: new Date(),
        isLegalSubject: true, // NOW they have legal rights and responsibilities
      },
    });

    return {
      ok: true,
      hasAcceptedConstitution: user.hasAcceptedConstitution,
      constitutionAcceptedAt: user.constitutionAcceptedAt,
      isLegalSubject: user.isLegalSubject,
      message: 'You are now a legal subject of INOMAD KHURAL with full rights and responsibilities',
    };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new BadRequestException('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Validate new password policy
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    
    if (!hasLetters || !hasNumbers) {
      throw new BadRequestException('New password must contain both letters and numbers');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return {
      ok: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(userId: string, seatId: string, role: string) {
    const jti = randomUUID();
    const refreshToken = randomUUID();
    const expiresIn = 3600; // 1 hour in seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const payload = { sub: userId, seatId, role, jti };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1h' });

    // Create session record in database (required for AuthGuard.validateSession)
    await this.prisma.authSession.create({
      data: {
        userId,
        jti,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate unique Seat ID for new users.
   *
   * DETERMINISM (P4): SeatId now includes blockchain entropy to ensure global
   * uniqueness even across server instances. The blockHash ensures that two
   * servers registering a user at the same millisecond will produce different IDs.
   *
   * Format: KHURAL-XXXXXXXXXXXXXXXX
   * Where X = sha256(username + timestamp + blockHash).slice(0, 16)
   *
   * Fallback: If blockchain is offline, uses cryptoRandomBytes for entropy.
   */
  private async generateSeatId(username: string = ''): Promise<string> {
    const prefix = 'KHURAL';
    const timestamp = Date.now().toString();

    // Get blockchain entropy (empty string if offline)
    let blockHash = '';
    if (this.blockchain) {
      try {
        blockHash = await this.blockchain.getCurrentBlockHash();
      } catch {
        // Non-fatal — use crypto fallback
      }
    }

    // Mix entropy sources
    const entropy = blockHash
      ? `${username}|${timestamp}|${blockHash.slice(2, 14)}`  // Use 12 chars of block hash
      : `${username}|${timestamp}|${crypto.randomBytes(16).toString('hex')}`; // Offline fallback

    const hash = crypto.createHash('sha256').update(entropy).digest('hex');
    return `${prefix}-${hash.slice(0, 16).toUpperCase()}`;
  }
}
