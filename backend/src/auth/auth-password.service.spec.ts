import { Test, TestingModule } from '@nestjs/testing';
import { AuthPasswordService } from './auth-password.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

describe('AuthPasswordService', () => {
  let service: AuthPasswordService;
  let prisma: any;

  const mockUser = {
    id: 'u1', seatId: 'KHURAL-ABC', username: 'alice',
    passwordHash: '$2b$12$hash', role: 'CITIZEN',
    verificationStatus: 'DRAFT', walletStatus: 'LOCKED',
    walletAddress: null, isFrozen: false,
    hasAcceptedTOS: false, hasAcceptedConstitution: false, isLegalSubject: false,
  };

  const mockPrisma = () => ({
    user: {
      findUnique: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    authSession: { create: jest.fn().mockResolvedValue({}) },
  });

  const mockJwt = () => ({
    signAsync: jest.fn().mockResolvedValue('jwt-token'),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPasswordService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: JwtService, useFactory: mockJwt },
      ],
    }).compile();
    service = module.get(AuthPasswordService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── register ──────────────────────────
  describe('register', () => {
    it('should register new user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      const result = await service.register({ username: 'alice', password: 'test1234' });
      expect(result.ok).toBe(true);
      expect(result.accessToken).toBeDefined();
    });

    it('should reject short username', async () => {
      await expect(service.register({ username: 'ab', password: 'test1234' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject short password', async () => {
      await expect(service.register({ username: 'alice', password: 'test1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject password without numbers', async () => {
      await expect(service.register({ username: 'alice', password: 'testtest' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject password without letters', async () => {
      await expect(service.register({ username: 'alice', password: '12345678' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate username', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.register({ username: 'alice', password: 'test1234' }))
        .rejects.toThrow(ConflictException);
    });

    it('should reject duplicate email', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null)  // username check
        .mockResolvedValueOnce({ id: 'existing' }); // email check
      await expect(service.register({ username: 'bob', password: 'test1234', email: 'a@b.com' }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ─── login ─────────────────────────────
  describe('login', () => {
    it('should login with valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.login({ username: 'alice', password: 'test1234' });
      expect(result.ok).toBe(true);
    });

    it('should reject invalid user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ username: 'bad', password: 'test1234' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ username: 'alice', password: 'wrong123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject frozen account', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isFrozen: true });
      await expect(service.login({ username: 'alice', password: 'test1234' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── acceptTOS ─────────────────────────
  describe('acceptTOS', () => {
    it('should update TOS acceptance', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, hasAcceptedTOS: true, tosAcceptedAt: new Date() });
      const result = await service.acceptTOS('u1');
      expect(result.ok).toBe(true);
      expect(result.hasAcceptedTOS).toBe(true);
    });
  });

  // ─── acceptConstitution ────────────────
  describe('acceptConstitution', () => {
    it('should update constitution acceptance and make legal subject', async () => {
      prisma.user.update.mockResolvedValue({
        ...mockUser, hasAcceptedConstitution: true, isLegalSubject: true,
        constitutionAcceptedAt: new Date(),
      });
      const result = await service.acceptConstitution('u1');
      expect(result.ok).toBe(true);
      expect(result.isLegalSubject).toBe(true);
    });
  });

  // ─── changePassword ────────────────────
  describe('changePassword', () => {
    it('should change password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});
      const result = await service.changePassword('u1', 'old1234', 'new12345');
      expect(result.ok).toBe(true);
    });

    it('should reject wrong old password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword('u1', 'wrong', 'new12345'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject weak new password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.changePassword('u1', 'old1234', 'short'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
