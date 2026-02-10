import { Test, TestingModule } from '@nestjs/testing';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CentralBankGuard } from '../auth/guards/central-bank.guard';

describe('CreditController', () => {
  let controller: CreditController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditController],
      providers: [
        { provide: CreditService, useValue: { getCreditLine: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(CentralBankGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<CreditController>(CreditController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
