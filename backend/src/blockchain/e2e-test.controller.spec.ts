import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestController } from './e2e-test.controller';
import { E2ETestService } from './e2e-test.service';
import { BlockchainService } from './blockchain.service';

describe('E2ETestController', () => {
  let controller: E2ETestController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [E2ETestController],
      providers: [
        { provide: E2ETestService, useValue: { runTests: jest.fn() } },
        { provide: BlockchainService, useValue: { getBalance: jest.fn() } },
      ],
    }).compile();
    controller = module.get<E2ETestController>(E2ETestController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
