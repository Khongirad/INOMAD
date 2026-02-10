import { Test, TestingModule } from '@nestjs/testing';
import { BankAuthController } from './bank-auth.controller';
import { BankAuthService } from './bank-auth.service';


describe('BankAuthController', () => {
  let controller: BankAuthController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankAuthController],
      providers: [
        { provide: BankAuthService, useValue: { login: jest.fn() } },
      ],
    })

    .compile();
    controller = module.get<BankAuthController>(BankAuthController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
