import { Test, TestingModule } from '@nestjs/testing';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { CentralBankAuthGuard } from '../central-bank/central-bank-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('DistributionController', () => {
  let controller: DistributionController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DistributionController],
      providers: [
        { provide: DistributionService, useValue: { getPoolStats: jest.fn().mockResolvedValue({}) } },
      ],
    })
    .overrideGuard(CentralBankAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<DistributionController>(DistributionController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
