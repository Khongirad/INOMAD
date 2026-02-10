import { Test, TestingModule } from '@nestjs/testing';
import { WalletProtectionController } from './wallet-protection.controller';
import { WalletProtectionService } from './wallet-protection.service';
import { RiskScorerService } from './risk-scorer.service';
import { AlertService } from './alert.service';
import { EventIndexerService } from './event-indexer.service';


describe('WalletProtectionController', () => {
  let controller: WalletProtectionController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletProtectionController],
      providers: [
        { provide: WalletProtectionService, useValue: { getProtectionStats: jest.fn().mockResolvedValue({}) } },
        { provide: RiskScorerService, useValue: { calculateRiskScore: jest.fn() } },
        { provide: AlertService, useValue: { getAlerts: jest.fn().mockResolvedValue([]) } },
        { provide: EventIndexerService, useValue: { getWalletHistory: jest.fn().mockResolvedValue([]) } },
      ],
    })

    .compile();
    controller = module.get<WalletProtectionController>(WalletProtectionController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
