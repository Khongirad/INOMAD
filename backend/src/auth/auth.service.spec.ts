import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from '../blockchain/blockchain.service';
import { UnauthorizedException } from '@nestjs/common';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    verifyMessage: jest.fn().mockReturnValue('0xValidAddress'),
  },
}));

// Mock randomUUID only — do NOT mock entire crypto module, it breaks NestJS internals
import * as crypto from 'crypto';
jest.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234' as any);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  const mockPrisma = () => ({
    authNonce: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    authSession: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('jwt-token') } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'AUTH_NONCE_TTL_SECONDS') return 300;
              if (key === 'AUTH_REFRESH_EXPIRY') return '24h';
              if (key === 'AUTH_JWT_EXPIRY') return '15m';
              if (key === 'SKIP_SEAT_VERIFICATION') return 'true';
              return null;
            }),
          },
        },
        {
          provide: BlockchainService,
          useValue: { getSeatsOwnedBy: jest.fn().mockResolvedValue(['seat-1']) },
        },
      ],
    }).compile();
    service = module.get(AuthService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── generateNonce ─────────────────────
  describe('generateNonce', () => {
    it('should generate nonce and return message', async () => {
      prisma.authNonce.create.mockResolvedValue({});
      const result = await service.generateNonce('0xAddress');
      expect(result.nonce).toBeDefined();
      expect(result.message).toContain('Sign in to INOMAD');
    });
  });

  // ─── verifySignature ──────────────────
  describe('verifySignature', () => {
    it('should verify and issue tokens', async () => {
      const futureDate = new Date(Date.now() + 300000);
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'test-nonce', address: '0xvalidaddress', consumed: false, expiresAt: futureDate,
      });
      prisma.authNonce.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'seat-1', walletAddress: '0xvalidaddress' });
      prisma.authSession.create.mockResolvedValue({});
      const { ethers } = require('ethers');
      ethers.verifyMessage.mockReturnValue('0xValidAddress');
      const result = await service.verifySignature('0xValidAddress', '0xsig', 'test-nonce');
      expect(result.accessToken).toBe('jwt-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw for invalid nonce', async () => {
      prisma.authNonce.findUnique.mockResolvedValue(null);
      await expect(service.verifySignature('0x1', 'sig', 'bad')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for consumed nonce', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({ consumed: true });
      await expect(service.verifySignature('0x1', 'sig', 'nonce')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for expired nonce', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        consumed: false, expiresAt: new Date(Date.now() - 1000), address: '0x1',
      });
      await expect(service.verifySignature('0x1', 'sig', 'nonce')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for address mismatch', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        consumed: false, expiresAt: new Date(Date.now() + 300000), address: '0xdifferent',
      });
      await expect(service.verifySignature('0x1', 'sig', 'nonce')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── getMe ─────────────────────────────
  describe('getMe', () => {
    it('should return user identity', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', seatId: 'seat-1', walletAddress: '0x1', role: 'CITIZEN',
        verificationStatus: 'VERIFIED', walletStatus: 'ACTIVE', bankLink: { bankCode: 'ABC', status: 'ACTIVE' },
      });
      const result = await service.getMe('u1');
      expect(result.seatId).toBe('seat-1');
      expect(result.hasBankLink).toBe(true);
    });

    it('should throw UnauthorizedException for missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe('bad')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refreshTokens ────────────────────
  describe('refreshTokens', () => {
    it('should refresh tokens', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      prisma.authSession.findUnique.mockResolvedValue({
        id: 's1', refreshToken: 'rt-1', isRevoked: false, expiresAt: futureDate,
        user: { id: 'u1', seatId: 'seat-1', walletAddress: '0x1' },
      });
      prisma.authSession.update.mockResolvedValue({});
      prisma.authSession.create.mockResolvedValue({});
      const result = await service.refreshTokens('rt-1');
      expect(result.accessToken).toBe('jwt-token');
    });

    it('should throw for revoked session', async () => {
      prisma.authSession.findUnique.mockResolvedValue({ isRevoked: true });
      await expect(service.refreshTokens('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for expired refresh token', async () => {
      prisma.authSession.findUnique.mockResolvedValue({
        isRevoked: false, expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refreshTokens('expired')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── logout ────────────────────────────
  describe('logout', () => {
    it('should revoke session by jti', async () => {
      prisma.authSession.updateMany.mockResolvedValue({ count: 1 });
      await service.logout('jti-1');
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { jti: 'jti-1', isRevoked: false },
      }));
    });
  });

  describe('logoutAll', () => {
    it('should revoke all sessions for user', async () => {
      prisma.authSession.updateMany.mockResolvedValue({ count: 3 });
      await service.logoutAll('u1');
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'u1', isRevoked: false },
      }));
    });
  });

  // ─── validateSession ──────────────────
  describe('validateSession', () => {
    it('should validate active session', async () => {
      prisma.authSession.findUnique.mockResolvedValue({ id: 's1', isRevoked: false });
      prisma.authSession.update.mockResolvedValue({});
      const result = await service.validateSession({ sub: 'u1', seatId: 'seat-1', address: '0x1', jti: 'jti-1' });
      expect(result.userId).toBe('u1');
    });

    it('should throw for revoked session', async () => {
      prisma.authSession.findUnique.mockResolvedValue({ isRevoked: true });
      await expect(service.validateSession({ sub: 'u1', seatId: 's1', address: '0x1', jti: 'jti-1' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw when session not found', async () => {
      prisma.authSession.findUnique.mockResolvedValue(null);
      await expect(service.validateSession({ sub: 'u1', seatId: 's1', address: '0x1', jti: 'bad' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── getExpirySeconds ─────────────────
  describe('getExpirySeconds (private)', () => {
    it('returns seconds for "s" unit', () => {
      const configService = { get: jest.fn().mockReturnValue('30s') };
      (service as any).configService = configService;
      expect((service as any).getExpirySeconds()).toBe(30);
    });

    it('returns seconds for "m" unit', () => {
      const configService = { get: jest.fn().mockReturnValue('15m') };
      (service as any).configService = configService;
      expect((service as any).getExpirySeconds()).toBe(900);
    });

    it('returns seconds for "h" unit', () => {
      const configService = { get: jest.fn().mockReturnValue('2h') };
      (service as any).configService = configService;
      expect((service as any).getExpirySeconds()).toBe(7200);
    });

    it('returns seconds for "d" unit', () => {
      const configService = { get: jest.fn().mockReturnValue('1d') };
      (service as any).configService = configService;
      expect((service as any).getExpirySeconds()).toBe(86400);
    });

    it('returns default 900 for invalid format', () => {
      const configService = { get: jest.fn().mockReturnValue('invalid') };
      (service as any).configService = configService;
      expect((service as any).getExpirySeconds()).toBe(900);
    });

    it('returns default 900 when not configured', () => {
      const configService = { get: jest.fn().mockReturnValue(undefined) };
      (service as any).configService = configService;
      expect((service as any).getExpirySeconds()).toBe(900);
    });
  });

  // ─── verifySignature edge cases ────────
  describe('verifySignature edge cases', () => {
    it('should throw when no user found for address', async () => {
      const futureDate = new Date(Date.now() + 300000);
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'test-nonce', address: '0xvalidaddress', consumed: false, expiresAt: futureDate,
      });
      prisma.authNonce.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(null);
      const { ethers } = require('ethers');
      ethers.verifyMessage.mockReturnValue('0xValidAddress');
      await expect(service.verifySignature('0xValidAddress', '0xsig', 'test-nonce'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
