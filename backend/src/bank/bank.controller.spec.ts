import { Test, TestingModule } from '@nestjs/testing';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { BankAuthGuard } from './bank-auth.guard';

describe('BankController', () => {
  let controller: BankController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankController],
      providers: [
        { provide: BankService, useValue: { getBalance: jest.fn(), deposit: jest.fn(), withdraw: jest.fn() } },
      ],
    })
    .overrideGuard(BankAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<BankController>(BankController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
