import { Test, TestingModule } from '@nestjs/testing';
import { SovereignFundController } from './sovereign-fund.controller';
import { SovereignFundService } from './sovereign-fund.service';
describe('SovereignFundController', () => {
  let controller: SovereignFundController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SovereignFundController],
      providers: [{ provide: SovereignFundService, useValue: { getBalance: jest.fn().mockResolvedValue({}), getStats: jest.fn().mockResolvedValue({}) } }],
    }).compile();
    controller = module.get<SovereignFundController>(SovereignFundController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
