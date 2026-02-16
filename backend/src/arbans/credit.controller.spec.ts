// Must mock the typechain factory before anything imports it
jest.mock('../typechain-types/factories/ArbanCreditLine__factory', () => ({
  ArbanCreditLine__factory: { connect: jest.fn() },
}));
jest.mock('../blockchain/abis/arbanCreditLine.abi', () => ({
  ArbanCreditLine_ABI: [],
  CreditType: { FAMILY: 0, ORGANIZATIONAL: 1 },
}));
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn().mockImplementation(() => ({})),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CentralBankGuard } from '../auth/guards/central-bank.guard';

describe('CreditController', () => {
  let controller: CreditController;
  let service: any;

  const req = { user: { sub: 'u1', privateKey: '0xABC' } };

  beforeEach(async () => {
    const mockService = {
      openFamilyCreditLine: jest.fn().mockResolvedValue({ creditRating: 750 }),
      borrowFamily: jest.fn().mockResolvedValue({ loanId: 1, txHash: '0x1' }),
      repayFamily: jest.fn().mockResolvedValue(undefined),
      getCreditLine: jest.fn().mockResolvedValue({ creditRating: 750 }),
      getLoans: jest.fn().mockResolvedValue([]),
      getCreditDashboard: jest.fn().mockResolvedValue({ totalBorrowed: '0' }),
      openOrgCreditLine: jest.fn().mockResolvedValue({ creditRating: 800 }),
      borrowOrg: jest.fn().mockResolvedValue({ loanId: 2, txHash: '0x2' }),
      repayOrg: jest.fn().mockResolvedValue(undefined),
      setInterestRate: jest.fn().mockResolvedValue(undefined),
      getCurrentInterestRate: jest.fn().mockResolvedValue(500),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditController],
      providers: [{ provide: CreditService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(CentralBankGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CreditController);
    service = module.get(CreditService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // Family
  it('opens family credit line', async () => {
    const r = await controller.openFamilyCreditLine(1, {}, req);
    expect(service.openFamilyCreditLine).toHaveBeenCalledWith(1, expect.anything());
  });

  it('borrows from family credit', async () => {
    const r = await controller.borrowFamily(1, { amount: '100', durationDays: 30 }, req);
    expect(service.borrowFamily).toHaveBeenCalled();
    expect(r.loanId).toBe(1);
  });

  it('repays family loan', async () => {
    const r = await controller.repayFamily(1, { loanIdx: 0 }, req);
    expect(r.success).toBe(true);
  });

  it('gets family credit line', async () => {
    await controller.getFamilyCreditLine(1);
    expect(service.getCreditLine).toHaveBeenCalledWith(1, 'FAMILY');
  });

  it('gets family loans', async () => {
    await controller.getFamilyLoans(1);
    expect(service.getLoans).toHaveBeenCalledWith(1, 'FAMILY');
  });

  it('gets family dashboard', async () => {
    await controller.getFamilyCreditDashboard(1);
    expect(service.getCreditDashboard).toHaveBeenCalledWith(1, 'FAMILY');
  });

  // Org
  it('opens org credit line', async () => {
    await controller.openOrgCreditLine(1, {}, req);
    expect(service.openOrgCreditLine).toHaveBeenCalled();
  });

  it('borrows from org credit', async () => {
    await controller.borrowOrg(1, { amount: '500', durationDays: 60 }, req);
    expect(service.borrowOrg).toHaveBeenCalled();
  });

  it('repays org loan', async () => {
    const r = await controller.repayOrg(1, { loanIdx: 0 }, req);
    expect(r.success).toBe(true);
  });

  it('gets org credit line', async () => {
    await controller.getOrgCreditLine(1);
    expect(service.getCreditLine).toHaveBeenCalledWith(1, 'ORG');
  });

  it('gets org loans', async () => {
    await controller.getOrgLoans(1);
    expect(service.getLoans).toHaveBeenCalledWith(1, 'ORG');
  });

  it('gets org dashboard', async () => {
    await controller.getOrgCreditDashboard(1);
    expect(service.getCreditDashboard).toHaveBeenCalledWith(1, 'ORG');
  });

  // Admin
  it('sets interest rate', async () => {
    const r = await controller.setInterestRate({ rateBps: 300 }, req);
    expect(r.success).toBe(true);
    expect(r.rateBps).toBe(300);
  });

  it('gets current interest rate', async () => {
    const r = await controller.getCurrentInterestRate();
    expect(r.rateBps).toBe(500);
    expect(r.percentagePerYear).toBe('5.00');
  });
});
