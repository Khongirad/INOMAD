import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthPasswordService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Register a new user with username and password
   * Gates of Khural registration flow
   */
  async register(dto: {
    username: string;
    password: string;
    email?: string;
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

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate unique SeatID
    const seatId = this.generateSeatId();

    // Create user
    const user = await this.prisma.user.create({
      data: {
        seatId,
        username: dto.username,
        passwordHash,
        email: dto.email,
        role: 'CITIZEN',
        verificationStatus: 'DRAFT',
        walletStatus: 'LOCKED',
        ethnicity: [],
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
   * Generate unique Seat ID for new users
   */
  private generateSeatId(): string {
    const prefix = 'KHURAL';
    const random = Math.random().toString(36).substring(2, 15).toUpperCase();
    return `${prefix}-${random}`;
  }
}
