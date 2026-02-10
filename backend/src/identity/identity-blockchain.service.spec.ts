import { Test, TestingModule } from '@nestjs/testing';
import { IdentityBlockchainService } from './identity-blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('IdentityBlockchainService', () => {
  let service: IdentityBlockchainService;

  beforeEach(async () => {
    const prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };
    const blockchain = { isAvailable: jest.fn().mockReturnValue(false), getProvider: jest.fn().mockReturnValue(null), getContractAddress: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityBlockchainService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();
    service = module.get<IdentityBlockchainService>(IdentityBlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
