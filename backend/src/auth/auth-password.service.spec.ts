import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthPasswordService } from './auth-password.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

describe('AuthPasswordService', () => {
  let service: AuthPasswordService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      authSession: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPasswordService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-access-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthPasswordService>(AuthPasswordService);
  });

  describe('register', () => {
    it('should reject username shorter than 3 chars', async () => {
      await expect(
        service.register({ username: 'ab', password: 'Password1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password shorter than 8 chars', async () => {
      await expect(
        service.register({ username: 'testuser', password: 'Pass1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without numbers', async () => {
      await expect(
        service.register({ username: 'testuser', password: 'PasswordOnly' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without letters', async () => {
      await expect(
        service.register({ username: 'testuser', password: '12345678' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate username', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ username: 'taken', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ id: 'existing' }); // email check

      await expect(
        service.register({
          username: 'newuser',
          password: 'Password1',
          email: 'taken@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user with correct defaults', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        seatId: 'KHURAL-ABC123',
        username: 'newuser',
        role: 'CITIZEN',
        verificationStatus: 'DRAFT',
        walletStatus: 'LOCKED',
        hasAcceptedTOS: false,
        hasAcceptedConstitution: false,
        isLegalSubject: false,
      });

      const result = await service.register({
        username: 'newuser',
        password: 'Password1',
      });

      expect(result.ok).toBe(true);
      expect(result.user.username).toBe('newuser');
      expect(result.user.role).toBe('CITIZEN');
      expect(result.user.status).toBe('DRAFT');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('login', () => {
    it('should reject non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nobody', password: 'Pass1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject frozen account', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: '$2b$12$hash',
        isFrozen: true,
      });

      await expect(
        service.login({ username: 'frozen', password: 'Pass1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: '$2b$12$hash',
        isFrozen: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'user', password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid login', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        seatId: 'KHURAL-ABC',
        username: 'user',
        walletAddress: '0x123',
        role: 'CITIZEN',
        passwordHash: '$2b$12$hash',
        isFrozen: false,
        verificationStatus: 'VERIFIED',
        walletStatus: 'ACTIVE',
        hasAcceptedTOS: true,
        hasAcceptedConstitution: true,
        isLegalSubject: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ username: 'user', password: 'Pass1234' });

      expect(result.ok).toBe(true);
      expect(result.user.seatId).toBe('KHURAL-ABC');
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('acceptTOS', () => {
    it('should update TOS acceptance', async () => {
      prisma.user.update.mockResolvedValue({
        hasAcceptedTOS: true,
        tosAcceptedAt: new Date(),
      });

      const result = await service.acceptTOS('user-1');

      expect(result.ok).toBe(true);
      expect(result.hasAcceptedTOS).toBe(true);
    });
  });

  describe('acceptConstitution', () => {
    it('should make user a legal subject', async () => {
      prisma.user.update.mockResolvedValue({
        hasAcceptedConstitution: true,
        constitutionAcceptedAt: new Date(),
        isLegalSubject: true,
      });

      const result = await service.acceptConstitution('user-1');

      expect(result.ok).toBe(true);
      expect(result.isLegalSubject).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should reject if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', 'OldPass1', 'NewPass1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject wrong current password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: '$2b$12$hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'WrongOld1', 'NewPass1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject weak new password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: '$2b$12$hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('user-1', 'OldPass1', 'short'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password on valid input', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: '$2b$12$hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', 'OldPass1', 'NewPassword1');

      expect(result.ok).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });
});
