import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CentralBankAuthService } from './central-bank-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('CentralBankAuthService', () => {
  let service: CentralBankAuthService;

  beforeEach(async () => {
    const prisma = {
      centralBankOfficer: { findUnique: jest.fn() },
    };

    const jwtService = {
      sign: jest.fn().mockReturnValue('mock-cb-ticket'),
      verify: jest.fn(),
    };

    const configService = {
      get: jest.fn((key: string) => {
        const config: any = {
          CB_JWT_SECRET: 'test-cb-secret',
          BANK_JWT_SECRET: 'test-bank-secret',
          AUTH_JWT_SECRET: 'test-auth-secret',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralBankAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CentralBankAuthService>(CentralBankAuthService);
  });

  describe('generateNonce', () => {
    it('should throw for empty address', async () => {
      await expect(service.generateNonce('')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for invalid address', async () => {
      await expect(service.generateNonce('not-an-address')).rejects.toThrow(UnauthorizedException);
    });

    it('should generate nonce for valid checksummed address', async () => {
      // Use a valid EIP-55 checksummed Ethereum address
      const result = await service.generateNonce('0x742d35Cc6634c0532925a3b844Bc9E7595F2bD10');
      expect(result.nonce).toBeDefined();
      expect(result.nonce.startsWith('CB:')).toBe(true);
      expect(result.message).toContain('Central Bank of Siberia');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('validateTicket', () => {
    it('should throw for missing fields', () => {
      expect(() => service.validateTicket({} as any)).toThrow(UnauthorizedException);
    });

    it('should throw for invalid role', () => {
      expect(() => service.validateTicket({
        officerId: 'o1', walletAddress: '0x123', role: 'INVALID' as any, jti: 'j1',
      })).toThrow(UnauthorizedException);
    });

    it('should return valid payload for GOVERNOR', () => {
      const payload = {
        officerId: 'o1', walletAddress: '0x123', role: 'GOVERNOR' as const, jti: 'j1',
      };
      expect(service.validateTicket(payload)).toEqual(payload);
    });

    it('should return valid payload for BOARD_MEMBER', () => {
      const payload = {
        officerId: 'o1', walletAddress: '0x123', role: 'BOARD_MEMBER' as const, jti: 'j1',
      };
      expect(service.validateTicket(payload)).toEqual(payload);
    });
  });

  describe('issueTicket', () => {
    it('should throw for invalid nonce format', async () => {
      await expect(service.issueTicket('0x123', 'sig', 'bad-nonce')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for unknown nonce', async () => {
      await expect(service.issueTicket('0x123', 'sig', 'CB:unknown-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
