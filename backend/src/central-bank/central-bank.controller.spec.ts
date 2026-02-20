import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankController } from './central-bank.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CentralBankService } from './central-bank.service';
import { CentralBankAuthService } from './central-bank-auth.service';
import { CBWorkflowService } from './cb-workflow.service';
import { CentralBankAuthGuard } from './central-bank-auth.guard';
import { EmissionProposalService } from './emission-proposal.service';

describe('CentralBankController', () => {
  let controller: CentralBankController;
  let cbService: any;
  let authService: any;
  let workflowService: any;
  const req = { cbUser: { officerId: 'o1' } } as any;

  beforeEach(async () => {
    const mockCbService = {
      getPublicStats: jest.fn().mockResolvedValue({ supply: 1000 }),
      emitToCorrespondentAccount: jest.fn().mockResolvedValue({ emitted: true }),
      burnFromCorrespondentAccount: jest.fn().mockResolvedValue({ burned: true }),
      getEmissionHistory: jest.fn().mockResolvedValue([]),
      getTotalSupply: jest.fn().mockResolvedValue({ total: 1000 }),
      getDailyEmissionUsage: jest.fn().mockResolvedValue({ daily: 100 }),
      issueLicense: jest.fn().mockResolvedValue({ id: 'l1' }),
      revokeLicense: jest.fn().mockResolvedValue(undefined),
      getLicensedBanks: jest.fn().mockResolvedValue([]),
      getCorrAccounts: jest.fn().mockResolvedValue([]),
      updatePolicy: jest.fn().mockResolvedValue({ updated: true }),
      getCurrentPolicy: jest.fn().mockResolvedValue({}),
      getPolicyHistory: jest.fn().mockResolvedValue([]),
    };
    const mockAuthService = {
      generateNonce: jest.fn().mockResolvedValue({ nonce: 'n1' }),
      issueTicket: jest.fn().mockResolvedValue({ ticket: 't1' }),
    };
    const mockWorkflow = {
      issueBankingLicense: jest.fn().mockResolvedValue({ id: 'bl1' }),
      openCorrespondentAccount: jest.fn().mockResolvedValue({ id: 'ca1' }),
      executeEmission: jest.fn().mockResolvedValue({ id: 'em1' }),
    };
    const mockEmissionProposal = {
      createProposal: jest.fn().mockResolvedValue({ id: 'ep1' }),
      approveProposal: jest.fn().mockResolvedValue({ id: 'ep1' }),
      executeProposal: jest.fn().mockResolvedValue({ id: 'ep1' }),
      rejectProposal: jest.fn().mockResolvedValue({ id: 'ep1' }),
      getProposals: jest.fn().mockResolvedValue([]),
      getProposal: jest.fn().mockResolvedValue({ id: 'ep1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CentralBankController],
      providers: [
        { provide: PrismaService, useValue: {} },
        { provide: CentralBankService, useValue: mockCbService },
        { provide: CentralBankAuthService, useValue: mockAuthService },
        { provide: CBWorkflowService, useValue: mockWorkflow },
        { provide: EmissionProposalService, useValue: mockEmissionProposal },
      ],
    }).overrideGuard(CentralBankAuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(CentralBankController);
    cbService = module.get(CentralBankService);
    authService = module.get(CentralBankAuthService);
    workflowService = module.get(CBWorkflowService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // Public
  it('getPublicStats', async () => { const r = await controller.getPublicStats(); expect(r.ok).toBe(true); });

  // Auth
  it('requestNonce', async () => { const r = await controller.requestNonce({ address: '0x1' } as any); expect(r.ok).toBe(true); });
  it('issueTicket', async () => { const r = await controller.issueTicket({ address: '0x1', signature: 'sig', nonce: 'n1' } as any); expect(r.ok).toBe(true); });

  // Emission
  it('mint', async () => { const r = await controller.mint({ corrAccountId: 'ca1', amount: 100, reason: 'r', memo: 'm' } as any, req); expect(r.ok).toBe(true); });
  it('burn', async () => { const r = await controller.burn({ corrAccountId: 'ca1', amount: 50, reason: 'r' } as any, req); expect(r.ok).toBe(true); });
  it('getEmissionHistory', async () => { const r = await controller.getEmissionHistory('10', '0'); expect(r.ok).toBe(true); });
  it('getEmissionHistory defaults', async () => { await controller.getEmissionHistory(); expect(cbService.getEmissionHistory).toHaveBeenCalledWith(50, 0); });
  it('getSupply', async () => { const r = await controller.getSupply(); expect(r.ok).toBe(true); });
  it('getDailyEmission', async () => { const r = await controller.getDailyEmission(); expect(r.ok).toBe(true); });

  // Licensing
  it('issueLicense', async () => { const r = await controller.issueLicense({ bankAddress: '0x', bankCode: 'BC', bankName: 'B' } as any, req); expect(r.ok).toBe(true); });
  it('revokeLicense', async () => { const r = await controller.revokeLicense({ licenseId: 'l1', reason: 'r' } as any, req); expect(r.ok).toBe(true); });
  it('getLicensedBanks', async () => { const r = await controller.getLicensedBanks(); expect(r.ok).toBe(true); });

  // Correspondent accounts
  it('getCorrAccounts', async () => { const r = await controller.getCorrAccounts(); expect(r.ok).toBe(true); });

  // Policy
  it('updatePolicy', async () => { const r = await controller.updatePolicy({ reason: 'r', maxEmission: 1000 } as any, req); expect(r.ok).toBe(true); });
  it('getCurrentPolicy', async () => { const r = await controller.getCurrentPolicy(); expect(r.ok).toBe(true); });
  it('getPolicyHistory', async () => { const r = await controller.getPolicyHistory('10'); expect(r.ok).toBe(true); });
  it('getPolicyHistory default', async () => { await controller.getPolicyHistory(); expect(cbService.getPolicyHistory).toHaveBeenCalledWith(50); });

  // Workflows
  it('issueBankingLicense', async () => { const r = await controller.issueBankingLicense({ name: 'B', legalAddress: 'A', taxId: 'T' }, req); expect(r.ok).toBe(true); });
  it('openCorrespondentAccount', async () => { const r = await controller.openCorrespondentAccount({ bankId: 'b1', accountNumber: '1234' }, req); expect(r.ok).toBe(true); });
  it('executeEmission', async () => { const r = await controller.executeEmission({ amount: '100', recipientBankId: 'b1', purpose: 'P' }, req); expect(r.ok).toBe(true); });

  // Banks
  it('listBanks', async () => { const r = await controller.listBanks(); expect(r.ok).toBe(true); });
  it('getBank', async () => { const r = await controller.getBank('b1'); expect(r.ok).toBe(false); });
});
