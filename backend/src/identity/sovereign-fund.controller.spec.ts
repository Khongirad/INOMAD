import { Test, TestingModule } from '@nestjs/testing';
import { SovereignFundController } from './sovereign-fund.controller';
import { SovereignFundService } from './sovereign-fund.service';

describe('SovereignFundController', () => {
  let controller: SovereignFundController;
  const mockService = {
    getCurrentBalance: jest.fn().mockResolvedValue(1000000),
    getFundStats: jest.fn().mockResolvedValue({ totalAssets: 5000000, citizens: 100 }),
    getIncomeBreakdown: jest.fn().mockResolvedValue([{ source: 'TAX', amount: 500 }]),
    getActiveInvestments: jest.fn().mockResolvedValue([{ id: 'i1', value: 10000 }]),
    getAnnualReports: jest.fn().mockResolvedValue([{ year: 2025 }]),
    getFundOverview: jest.fn().mockResolvedValue({ balance: 1000000, invested: 500000 }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SovereignFundController],
      providers: [{ provide: SovereignFundService, useValue: mockService }],
    }).compile();
    controller = module.get(SovereignFundController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets balance', async () => {
    const r = await controller.getBalance();
    expect(r.balance).toBe(1000000);
  });

  it('gets stats', async () => {
    const r = await controller.getStats();
    expect(r.totalAssets).toBe(5000000);
  });

  it('gets income breakdown', async () => {
    const r = await controller.getIncomeBreakdown();
    expect(r).toHaveLength(1);
  });

  it('gets investments', async () => {
    const r = await controller.getInvestments();
    expect(r).toHaveLength(1);
  });

  it('gets reports', async () => {
    const r = await controller.getReports();
    expect(r).toHaveLength(1);
  });

  it('gets overview', async () => {
    const r = await controller.getOverview();
    expect(r.balance).toBe(1000000);
  });
});
