import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankController } from './central-bank.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CentralBankService } from './central-bank.service';
import { CentralBankAuthService } from './central-bank-auth.service';
import { CBWorkflowService } from './cb-workflow.service';
import { CentralBankAuthGuard } from './central-bank-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatorGuard } from '../auth/guards/creator.guard';

describe('CentralBankController', () => {
  let controller: CentralBankController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CentralBankController],
      providers: [
        { provide: PrismaService, useValue: {} },
        { provide: CentralBankService, useValue: { getEmissionHistory: jest.fn().mockResolvedValue([]) } },
        { provide: CentralBankAuthService, useValue: { generateNonce: jest.fn() } },
        { provide: CBWorkflowService, useValue: { issueBankingLicense: jest.fn() } },
      ],
    })
    .overrideGuard(CentralBankAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(CreatorGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<CentralBankController>(CentralBankController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
