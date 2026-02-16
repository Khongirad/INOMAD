import { Test, TestingModule } from '@nestjs/testing';
import { OrgBankingController } from './org-banking.controller';
import { OrgBankingService } from './org-banking.service';
import { AuthGuard } from '../auth/auth.guard';

describe('OrgBankingController', () => {
  let controller: OrgBankingController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getOrgAccounts: jest.fn().mockResolvedValue([]),
      initiateTransaction: jest.fn().mockResolvedValue({ id: 'tx1' }),
      signTransaction: jest.fn().mockResolvedValue({ signed: true }),
      bankApproveTransaction: jest.fn().mockResolvedValue({ approved: true }),
      cancelTransaction: jest.fn().mockResolvedValue({ cancelled: true }),
      getAccountTransactions: jest.fn().mockResolvedValue({ items: [] }),
      getPendingTransactions: jest.fn().mockResolvedValue([]),
      getDailyReports: jest.fn().mockResolvedValue({ items: [] }),
      getDailyReport: jest.fn().mockResolvedValue({}),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgBankingController],
      providers: [{ provide: OrgBankingService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(OrgBankingController);
    service = module.get(OrgBankingService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getOrgAccounts', async () => { await controller.getOrgAccounts('org1'); expect(service.getOrgAccounts).toHaveBeenCalledWith('org1'); });
  it('initiateTransaction', async () => { const dto = { accountId: 'a1', type: 'TRANSFER' as any, amount: 100, description: 'D' }; await controller.initiateTransaction(req, dto); expect(service.initiateTransaction).toHaveBeenCalledWith('a1', 'u1', dto); });
  it('signTransaction', async () => { await controller.signTransaction('tx1', req); expect(service.signTransaction).toHaveBeenCalledWith('tx1', 'u1'); });
  it('bankApproveTransaction', async () => { await controller.bankApproveTransaction('tx1', req, { approve: true }); expect(service.bankApproveTransaction).toHaveBeenCalledWith('tx1', 'u1', true, undefined); });
  it('cancelTransaction', async () => { await controller.cancelTransaction('tx1', req); expect(service.cancelTransaction).toHaveBeenCalledWith('tx1', 'u1'); });
  it('getAccountTransactions', async () => { await controller.getAccountTransactions('a1', '1', '10'); expect(service.getAccountTransactions).toHaveBeenCalledWith('a1', { page: 1, limit: 10, status: undefined }); });
  it('getPendingTransactions', async () => { await controller.getPendingTransactions('a1'); expect(service.getPendingTransactions).toHaveBeenCalledWith('a1'); });
  it('getDailyReports', async () => { await controller.getDailyReports('a1'); expect(service.getDailyReports).toHaveBeenCalledWith('a1', { page: 1, limit: 30 }); });
  it('getDailyReport', async () => { await controller.getDailyReport('a1', '2025-01-01'); expect(service.getDailyReport).toHaveBeenCalled(); });
});
