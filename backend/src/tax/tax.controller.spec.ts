import { Test, TestingModule } from '@nestjs/testing';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { CentralBankGuard } from '../auth/guards/central-bank.guard';

describe('TaxController', () => {
  let controller: TaxController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxController],
      providers: [
        { provide: TaxService, useValue: { getTaxQuote: jest.fn(), collectTax: jest.fn(), getStats: jest.fn().mockResolvedValue({}) } },
      ],
    })
    .overrideGuard(CentralBankGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<TaxController>(TaxController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
