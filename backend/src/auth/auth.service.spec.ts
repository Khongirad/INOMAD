import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { createMockPrismaService } from '../../test/mocks/prisma.mock';
import { createMockBlockchainService } from '../../test/mocks/blockchain.mock';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let blockchainService: ReturnType<typeof createMockBlockchainService>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        AUTH_NONCE_TTL_SECONDS: '300',
        AUTH_REFRESH_EXPIRY: '24h',
        AUTH_JWT_EXPIRY: '15m',
        SKIP_SEAT_VERIFICATION: 'true', // Skip blockchain checks in tests
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    blockchainService = createMockBlockchainService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
            verify: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BlockchainService, useValue: blockchainService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('generateNonce', () => {
    it('should create a nonce for a valid address', async () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      (prisma.authNonce as any) = { create: jest.fn().mockResolvedValue({}) };

      const result = await service.generateNonce(address);

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Sign in to INOMAD:');
      expect((prisma.authNonce as any).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: address.toLowerCase(),
          nonce: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should normalize address to lowercase', async () => {
      const address = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      (prisma.authNonce as any) = { create: jest.fn().mockResolvedValue({}) };

      await service.generateNonce(address);

      expect((prisma.authNonce as any).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: address.toLowerCase(),
        }),
      });
    });
  });

  describe('verifySignature', () => {
    it('should throw on invalid nonce', async () => {
      (prisma.authNonce as any) = { findUnique: jest.fn().mockResolvedValue(null) };

      await expect(
        service.verifySignature('0xAddress', '0xSig', 'invalid-nonce'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on expired nonce', async () => {
      (prisma.authNonce as any) = {
        findUnique: jest.fn().mockResolvedValue({
          nonce: 'test-nonce',
          address: '0xaddress',
          consumed: false,
          expiresAt: new Date(Date.now() - 10000), // expired
        }),
      };

      await expect(
        service.verifySignature('0xAddress', '0xSig', 'test-nonce'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on already consumed nonce', async () => {
      (prisma.authNonce as any) = {
        findUnique: jest.fn().mockResolvedValue({
          nonce: 'test-nonce',
          address: '0xaddress',
          consumed: true,
          expiresAt: new Date(Date.now() + 60000),
        }),
      };

      await expect(
        service.verifySignature('0xAddress', '0xSig', 'test-nonce'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke session by jti', async () => {
      (prisma.authSession as any) = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };

      await service.logout('test-jti');

      expect((prisma.authSession as any).updateMany).toHaveBeenCalledWith({
        where: { jti: 'test-jti', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('logoutAll', () => {
    it('should revoke all sessions for user', async () => {
      (prisma.authSession as any) = { updateMany: jest.fn().mockResolvedValue({ count: 3 }) };

      await service.logoutAll('user-123');

      expect((prisma.authSession as any).updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });

  describe('validateSession', () => {
    it('should return user data for valid session', async () => {
      (prisma.authSession as any) = {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', isRevoked: false }),
        update: jest.fn().mockResolvedValue({}),
      };

      const result = await service.validateSession({
        sub: 'user-1',
        seatId: 'SEAT-001',
        address: '0xaddr',
        jti: 'valid-jti',
      });

      expect(result).toEqual({
        userId: 'user-1',
        seatId: 'SEAT-001',
        address: '0xaddr',
      });
    });

    it('should throw for revoked session', async () => {
      (prisma.authSession as any) = {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', isRevoked: true }),
      };

      await expect(
        service.validateSession({
          sub: 'user-1',
          seatId: 'SEAT-001',
          address: '0xaddr',
          jti: 'revoked-jti',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
