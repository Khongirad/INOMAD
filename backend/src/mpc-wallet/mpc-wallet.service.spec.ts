import { Test, TestingModule } from '@nestjs/testing';
import { MPCWalletService } from './mpc-wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MPCWalletService', () => {
  let service: MPCWalletService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      mPCWallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      mPCKeyShare: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MPCWalletService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BlockchainService,
          useValue: { getProvider: jest.fn().mockReturnValue(null) },
        },
      ],
    }).compile();

    service = module.get(MPCWalletService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ======================== getWallet ========================

  describe('getWallet', () => {
    it('returns wallet if found', async () => {
      const wallet = { id: 'w1', address: '0x123', userId: 'u1' };
      prisma.mPCWallet.findUnique.mockResolvedValue(wallet);
      const result = await service.getWallet('u1');
      expect(result.address).toBe('0x123');
    });

    it('throws if wallet not found', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(null);
      await expect(service.getWallet('u999')).rejects.toThrow(NotFoundException);
    });
  });

  // ======================== createWallet ========================

  describe('createWallet', () => {
    it('throws if wallet already exists', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue({ id: 'w1' });
      await expect(service.createWallet('u1')).rejects.toThrow(BadRequestException);
    });

  });

  // ======================== internal crypto methods ========================
  // These methods depend on SERVER_SHARE_KEY env var for AES-256 encryption.
  // Integration tests cover them; here we just verify the methods exist.

  it('has splitKey method', () => {
    expect((service as any).splitKey).toBeDefined();
  });

  it('has combineShares method', () => {
    expect((service as any).combineShares).toBeDefined();
  });

  it('has encryptShare method', () => {
    expect((service as any).encryptShare).toBeDefined();
  });

  it('has decryptShare method', () => {
    expect((service as any).decryptShare).toBeDefined();
  });

  // ======================== reconstructSigner ========================

  describe('reconstructSigner', () => {
    it('throws if wallet not found', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(null);
      await expect(service.reconstructSigner('w99', 'share')).rejects.toThrow(NotFoundException);
    });
  });

  // ======================== signTransaction ========================

  describe('signTransaction', () => {
    it('throws if wallet not found', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(null);
      await expect(
        service.signTransaction('w99', 'share', { to: '0x1', value: 0n }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ======================== signMessage ========================

  describe('signMessage', () => {
    it('throws if wallet not found', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(null);
      await expect(
        service.signMessage('w99', 'share', 'hello'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
