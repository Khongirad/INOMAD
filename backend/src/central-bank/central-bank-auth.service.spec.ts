import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankAuthService } from './central-bank-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

describe('CentralBankAuthService', () => {
  let service: CentralBankAuthService;
  let prisma: any;
  let jwtService: any;

  const mockOfficer = {
    id: 'off1', walletAddress: '0xabc123', role: 'GOVERNOR', isActive: true,
  };

  beforeEach(async () => {
    const mockPrisma = {
      centralBankOfficer: {
        findUnique: jest.fn().mockResolvedValue(mockOfficer),
      },
    };
    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock-cb-ticket'),
    };
    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
          CB_JWT_SECRET: 'cb-test-secret',
          BANK_JWT_SECRET: 'bank-test-secret',
          AUTH_JWT_SECRET: 'auth-test-secret',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralBankAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(CentralBankAuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('generateNonce', () => {
    it('generates nonce for valid address', async () => {
      const addr = '0x1234567890abcdef1234567890abcdef12345678';
      const r = await service.generateNonce(addr);
      expect(r.nonce).toContain('CB:');
      expect(r.message).toContain('Central Bank of Siberia:');
      expect(r.expiresAt).toBeInstanceOf(Date);
    });
    it('throws for invalid address', async () => {
      await expect(service.generateNonce('not-an-address')).rejects.toThrow('Invalid wallet');
    });
    it('throws for empty address', async () => {
      await expect(service.generateNonce('')).rejects.toThrow('Invalid wallet');
    });
  });

  describe('issueTicket', () => {
    it('throws for invalid nonce format', async () => {
      await expect(
        service.issueTicket('0x123', 'sig', 'bad-nonce'),
      ).rejects.toThrow('Invalid nonce format');
    });
    it('throws for unknown nonce', async () => {
      await expect(
        service.issueTicket('0x123', 'sig', 'CB:unknown'),
      ).rejects.toThrow('Nonce not found');
    });
    it('throws for already consumed nonce', async () => {
      const addr = '0x1234567890abcdef1234567890abcdef12345678';
      const { nonce } = await service.generateNonce(addr);
      // Manually consume
      (service as any).nonceStore.get(nonce).consumed = true;
      await expect(
        service.issueTicket(addr, 'sig', nonce),
      ).rejects.toThrow('already consumed');
    });
    it('throws for expired nonce', async () => {
      const addr = '0x1234567890abcdef1234567890abcdef12345678';
      const { nonce } = await service.generateNonce(addr);
      // Force expire
      (service as any).nonceStore.get(nonce).expiresAt = new Date(0);
      await expect(
        service.issueTicket(addr, 'sig', nonce),
      ).rejects.toThrow('expired');
    });
    it('throws for address mismatch', async () => {
      const addr = '0x1234567890abcdef1234567890abcdef12345678';
      const { nonce } = await service.generateNonce(addr);
      await expect(
        service.issueTicket('0xdifferent567890abcdef1234567890abcdef1234', 'sig', nonce),
      ).rejects.toThrow('Address mismatch');
    });
    it('issues ticket with valid signature', async () => {
      const wallet = ethers.Wallet.createRandom();
      const addr = wallet.address;
      const { nonce, message } = await service.generateNonce(addr);
      const signature = await wallet.signMessage(message);

      prisma.centralBankOfficer.findUnique.mockResolvedValue({
        ...mockOfficer, walletAddress: addr.toLowerCase(),
      });

      const r = await service.issueTicket(addr, signature, nonce);
      expect(r.cbTicket).toBe('mock-cb-ticket');
      expect(r.expiresIn).toBe(900);
      expect(jwtService.sign).toHaveBeenCalled();
    });
    it('throws when officer not found', async () => {
      const wallet = ethers.Wallet.createRandom();
      const addr = wallet.address;
      const { nonce, message } = await service.generateNonce(addr);
      const signature = await wallet.signMessage(message);

      prisma.centralBankOfficer.findUnique.mockResolvedValue(null);

      await expect(
        service.issueTicket(addr, signature, nonce),
      ).rejects.toThrow('not a registered');
    });
    it('throws when officer inactive', async () => {
      const wallet = ethers.Wallet.createRandom();
      const addr = wallet.address;
      const { nonce, message } = await service.generateNonce(addr);
      const signature = await wallet.signMessage(message);

      prisma.centralBankOfficer.findUnique.mockResolvedValue({
        ...mockOfficer, isActive: false,
      });

      await expect(
        service.issueTicket(addr, signature, nonce),
      ).rejects.toThrow('not a registered');
    });
  });

  describe('validateTicket', () => {
    it('validates valid ticket payload', () => {
      const p = service.validateTicket({
        officerId: 'off1', walletAddress: '0xabc',
        role: 'GOVERNOR', jti: 'j1',
      });
      expect(p.role).toBe('GOVERNOR');
    });
    it('validates BOARD_MEMBER role', () => {
      const p = service.validateTicket({
        officerId: 'off1', walletAddress: '0xabc',
        role: 'BOARD_MEMBER', jti: 'j2',
      });
      expect(p.role).toBe('BOARD_MEMBER');
    });
    it('throws for missing officerId', () => {
      expect(() => service.validateTicket({
        officerId: '', walletAddress: '0xabc',
        role: 'GOVERNOR', jti: 'j1',
      })).toThrow('Invalid CB ticket');
    });
    it('throws for invalid role', () => {
      expect(() => service.validateTicket({
        officerId: 'off1', walletAddress: '0xabc',
        role: 'INVALID' as any, jti: 'j1',
      })).toThrow('Invalid CB officer role');
    });
  });
});
