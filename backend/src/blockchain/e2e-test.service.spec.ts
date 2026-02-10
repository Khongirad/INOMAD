import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestService } from './e2e-test.service';
import { BlockchainService } from './blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

describe('E2ETestService', () => {
  let service: E2ETestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        E2ETestService,
        { provide: BlockchainService, useValue: { isAvailable: jest.fn().mockReturnValue(false) } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = module.get<E2ETestService>(E2ETestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
