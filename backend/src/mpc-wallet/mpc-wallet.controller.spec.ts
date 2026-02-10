import { Test, TestingModule } from '@nestjs/testing';
import { MPCWalletController } from './mpc-wallet.controller';
import { MPCWalletService } from './mpc-wallet.service';
import { RecoveryService } from './recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MPCWalletController', () => {
  let controller: MPCWalletController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MPCWalletController],
      providers: [
        { provide: MPCWalletService, useValue: { createWallet: jest.fn(), getWallet: jest.fn() } },
        { provide: RecoveryService, useValue: { addGuardian: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<MPCWalletController>(MPCWalletController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
