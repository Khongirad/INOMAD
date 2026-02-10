import { Test, TestingModule } from '@nestjs/testing';
import { MPCWalletService } from './mpc-wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('MPCWalletService', () => {
  let service: MPCWalletService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      mPCWallet: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      keyShare: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn(), update: jest.fn() },
    };
    const blockchain = { getProvider: jest.fn().mockReturnValue(null) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MPCWalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();
    service = module.get<MPCWalletService>(MPCWalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
