import { Test, TestingModule } from '@nestjs/testing';
import { BankAuthService } from './bank-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => ({})),
    verifyMessage: jest.fn().mockReturnValue('0xABCDEF'),
  },
}));

describe('BankAuthService', () => {
  let service: BankAuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    const mockPrisma = {
      authNonce: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          nonce: 'BANK:test-nonce',
          address: '0xabcdef',
          consumed: false,
          expiresAt: new Date(Date.now() + 300000),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          bankLink: {
            bankRef: 'ref-12345678',
            bankCode: 'BSB',
            status: 'ACTIVE',
          },
        }),
      },
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('bank-jwt-token'),
      verify: jest.fn().mockReturnValue({ bankRef: 'ref-1234', seatId: '42' }),
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'BANK_JWT_SECRET': return 'bank-secret';
          case 'JWT_SECRET': return 'auth-secret';
          case 'ALTAN_RPC_URL': return 'http://localhost:8545';
          case 'SEAT_SBT_ADDRESS': return '0xSEAT';
          case 'BANK_TICKET_EXPIRY': return '5m';
          default: return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(BankAuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('generateNonce', () => {
    it('generates nonce', async () => {
      const r = await service.generateNonce('0xABCDEF');
      expect(r.nonce).toMatch(/^BANK:/);
      expect(r.message).toContain('Bank of Siberia');
      expect(prisma.authNonce.create).toHaveBeenCalled();
    });
  });

  describe('issueTicket', () => {
    it('issues ticket successfully', async () => {
      // Set up seat ownership
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(1)),
        tokenOfOwnerByIndex: jest.fn().mockResolvedValue(BigInt(42)),
      };

      const r = await service.issueTicket('0xABCDEF', 'sig-123', 'BANK:test-nonce');
      expect(r.bankTicket).toBe('bank-jwt-token');
      expect(r.expiresIn).toBeDefined();
    });

    it('throws on invalid nonce prefix', async () => {
      await expect(service.issueTicket('0xABCDEF', 'sig', 'bad-nonce'))
        .rejects.toThrow('Invalid bank nonce format');
    });

    it('throws when nonce not found', async () => {
      prisma.authNonce.findUnique.mockResolvedValue(null);
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:missing'))
        .rejects.toThrow('Invalid bank nonce');
    });

    it('throws when nonce already consumed', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'BANK:test', address: '0xabcdef', consumed: true,
        expiresAt: new Date(Date.now() + 300000),
      });
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test'))
        .rejects.toThrow('already used');
    });

    it('throws when nonce expired', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'BANK:test', address: '0xabcdef', consumed: false,
        expiresAt: new Date(Date.now() - 300000),
      });
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test'))
        .rejects.toThrow('expired');
    });

    it('throws when address mismatch', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        nonce: 'BANK:test', address: '0xother', consumed: false,
        expiresAt: new Date(Date.now() + 300000),
      });
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test'))
        .rejects.toThrow('mismatch');
    });

    it('throws when no seat found', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(0)),
      };
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test-nonce'))
        .rejects.toThrow('No SeatSBT');
    });

    it('throws when no bank link', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(1)),
        tokenOfOwnerByIndex: jest.fn().mockResolvedValue(BigInt(42)),
      };
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test-nonce'))
        .rejects.toThrow('No bank account');
    });

    it('throws when bank account inactive', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(1)),
        tokenOfOwnerByIndex: jest.fn().mockResolvedValue(BigInt(42)),
      };
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', bankLink: { bankRef: 'ref', bankCode: 'BSB', status: 'INACTIVE' },
      });
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test-nonce'))
        .rejects.toThrow('not active');
    });

    it('throws when bank secret not configured', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(1)),
        tokenOfOwnerByIndex: jest.fn().mockResolvedValue(BigInt(42)),
      };
      configService.get = jest.fn().mockReturnValue(undefined);
      await expect(service.issueTicket('0xABCDEF', 'sig', 'BANK:test-nonce'))
        .rejects.toThrow('not configured');
    });
  });

  describe('verifySeatOwnership', () => {
    it('returns null when offline', async () => {
      (service as any).seatSBTContract = null;
      expect(await (service as any).verifySeatOwnership('0x1')).toBeNull();
    });
    it('returns seatId', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(1)),
        tokenOfOwnerByIndex: jest.fn().mockResolvedValue(BigInt(42)),
      };
      expect(await (service as any).verifySeatOwnership('0x1')).toBe('42');
    });
    it('returns null when no seats', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockResolvedValue(BigInt(0)),
      };
      expect(await (service as any).verifySeatOwnership('0x1')).toBeNull();
    });
    it('returns null on error', async () => {
      (service as any).seatSBTContract = {
        balanceOf: jest.fn().mockRejectedValue(new Error('fail')),
      };
      expect(await (service as any).verifySeatOwnership('0x1')).toBeNull();
    });
  });

  describe('getTicketExpirySeconds', () => {
    it('returns configured value', () => {
      expect((service as any).getTicketExpirySeconds()).toBe(300);
    });
    it('returns default on invalid', () => {
      configService.get = jest.fn().mockReturnValue('invalid');
      expect((service as any).getTicketExpirySeconds()).toBe(300);
    });
    it('handles seconds', () => {
      configService.get = jest.fn().mockReturnValue('30s');
      expect((service as any).getTicketExpirySeconds()).toBe(30);
    });
    it('handles hours', () => {
      configService.get = jest.fn().mockReturnValue('1h');
      expect((service as any).getTicketExpirySeconds()).toBe(3600);
    });
    it('returns default when not configured', () => {
      configService.get = jest.fn().mockReturnValue(undefined);
      expect((service as any).getTicketExpirySeconds()).toBe(300);
    });
  });

  // ─── validateTicket ──────────────────────
  describe('validateTicket', () => {
    it('returns validated payload', () => {
      const payload = { bankRef: 'ref-1234', seatId: '42', bankCode: 'BSB', jti: 'jti-1' };
      const r = service.validateTicket(payload);
      expect(r.bankRef).toBe('ref-1234');
    });
  });

  // ─── validateSecretSeparation ────────────
  describe('validateSecretSeparation', () => {
    it('warns when secrets match', () => {
      configService.get = jest.fn().mockReturnValue('same-secret');
      (service as any).validateSecretSeparation();
      // no throw, just warning logged
    });

    it('validates when secrets are different', () => {
      configService.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'BANK_JWT_SECRET') return 'bank-secret';
        if (key === 'JWT_SECRET') return 'auth-secret';
        return undefined;
      });
      (service as any).validateSecretSeparation();
      // no throw
    });

    it('warns when bank secret not set', () => {
      configService.get = jest.fn().mockReturnValue(undefined);
      (service as any).validateSecretSeparation();
      // no throw, just warning logged
    });
  });
});

