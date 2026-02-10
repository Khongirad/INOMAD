import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BankAuthService } from './bank-auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BankAuthService', () => {
  let service: BankAuthService;
  let prisma: any;

  const mockConfig: Record<string, string> = {
    BANK_JWT_SECRET: 'bank-secret-123',
    AUTH_JWT_SECRET: 'auth-secret-456',
    BANK_TICKET_EXPIRY: '5m',
    ALTAN_RPC_URL: '',
    SEAT_SBT_ADDRESS: '',
  };

  beforeEach(async () => {
    prisma = {
      authNonce: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-bank-ticket'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<BankAuthService>(BankAuthService);
  });

  describe('generateNonce', () => {
    it('should create bank-specific nonce with BANK: prefix', async () => {
      const result = await service.generateNonce('0xAddress');

      expect(result.nonce).toMatch(/^BANK:/);
      expect(result.message).toContain('Bank of Siberia:');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(prisma.authNonce.create).toHaveBeenCalled();
    });

    it('should normalize address to lowercase', async () => {
      await service.generateNonce('0xABCDEF');

      expect(prisma.authNonce.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: '0xabcdef',
        }),
      });
    });
  });

  describe('issueTicket', () => {
    it('should reject non-bank nonce format', async () => {
      await expect(
        service.issueTicket('0xAddr', '0xSig', 'regular-nonce'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid nonce', async () => {
      prisma.authNonce.findUnique.mockResolvedValue(null);

      await expect(
        service.issueTicket('0xAddr', '0xSig', 'BANK:invalid'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject consumed nonce', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'BANK:test',
        address: '0xaddr',
        consumed: true,
        expiresAt: new Date(Date.now() + 60000),
      });

      await expect(
        service.issueTicket('0xAddr', '0xSig', 'BANK:test'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired nonce', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'BANK:test',
        address: '0xaddr',
        consumed: false,
        expiresAt: new Date(Date.now() - 10000),
      });

      await expect(
        service.issueTicket('0xAddr', '0xSig', 'BANK:test'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateTicket', () => {
    it('should return valid payload', () => {
      const payload = {
        bankRef: 'ref-123',
        seatId: 'SEAT-001',
        bankCode: 'ALT-001',
        jti: 'jti-1',
      };

      const result = service.validateTicket(payload);
      expect(result).toEqual(payload);
    });

    it('should reject incomplete payload', () => {
      expect(() =>
        service.validateTicket({
          bankRef: '',
          seatId: 'SEAT-001',
          bankCode: 'ALT-001',
          jti: 'jti-1',
        }),
      ).toThrow(UnauthorizedException);
    });
  });
});
