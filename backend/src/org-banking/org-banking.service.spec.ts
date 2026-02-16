import { Test, TestingModule } from '@nestjs/testing';
import { OrgBankingService } from './org-banking.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('OrgBankingService', () => {
  let service: OrgBankingService;
  let prisma: any;

  const mockAccount = {
    id: 'acc-1', organizationId: 'org-1', accountName: 'Operating',
    accountNumber: 'ORG-GEN-12345678', accountType: 'OPERATING',
    balance: 5000, currency: 'ALTAN', isActive: true,
    clientSignaturesRequired: 1, bankApprovalLevel: 'MANAGER',
    organization: { id: 'org-1', name: 'Test Org' },
    createdAt: new Date(),
  };

  const mockTx = {
    id: 'tx-1', accountId: 'acc-1', type: 'OUTGOING', amount: 100,
    description: 'Payment', recipientAccount: 'ext-acc',
    initiatorId: 'user-1', status: 'PENDING',
    clientSignatures: [{ userId: 'user-1', signedAt: '2024-01-01', signature: 'SIG-1' }],
    clientApproved: false, bankApproved: false,
    account: mockAccount, reportDate: new Date(), createdAt: new Date(),
  };

  const mockMember = { id: 'mem-1', userId: 'user-1', organizationId: 'org-1', role: 'LEADER' };
  const mockPermission = { canManageTreasury: true };

  const mockReport = {
    id: 'rpt-1', accountId: 'acc-1', reportDate: new Date(),
    openingBalance: 5000, closingBalance: 4900, totalIncoming: 0,
    totalOutgoing: 100, txCount: 1, pendingCount: 0,
    transactions: [],
  };

  const baseMock = (val: any = null) => ({
    findUnique: jest.fn().mockResolvedValue(val),
    findFirst: jest.fn().mockResolvedValue(val),
    findMany: jest.fn().mockResolvedValue(val ? [val] : []),
    create: jest.fn().mockResolvedValue(val),
    update: jest.fn().mockResolvedValue(val),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(3),
  });

  beforeEach(async () => {
    prisma = {
      orgBankAccount: baseMock(mockAccount),
      orgBankTransaction: baseMock(mockTx),
      organizationMember: baseMock(mockMember),
      orgPermission: baseMock(mockPermission),
      bankDailyReport: baseMock(mockReport),
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgBankingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrgBankingService>(OrgBankingService);
  });

  it('should be defined', () => { expect(service).toBeDefined(); });

  // ── INITIATE TRANSACTION ──

  describe('initiateTransaction', () => {
    it('should initiate a transaction', async () => {
      prisma.orgBankTransaction.create.mockResolvedValue({
        ...mockTx, id: 'tx-new', status: 'CLIENT_APPROVED', clientApproved: true,
      });
      const result = await service.initiateTransaction('acc-1', 'user-1', {
        type: 'OUTGOING' as any, amount: 100, description: 'Payment', recipientAccount: 'ext',
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if account not found', async () => {
      prisma.orgBankAccount.findUnique.mockResolvedValue(null);
      await expect(service.initiateTransaction('bad', 'user-1', {
        type: 'OUTGOING' as any, amount: 100, description: 'X',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive account', async () => {
      prisma.orgBankAccount.findUnique.mockResolvedValue({ ...mockAccount, isActive: false });
      await expect(service.initiateTransaction('acc-1', 'user-1', {
        type: 'OUTGOING' as any, amount: 100, description: 'X',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not a member', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.initiateTransaction('acc-1', 'stranger', {
        type: 'OUTGOING' as any, amount: 100, description: 'X',
      })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if no treasury permission', async () => {
      prisma.orgPermission.findUnique.mockResolvedValue({ canManageTreasury: false });
      await expect(service.initiateTransaction('acc-1', 'user-1', {
        type: 'OUTGOING' as any, amount: 100, description: 'X',
      })).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for insufficient funds on OUTGOING', async () => {
      prisma.orgBankAccount.findUnique.mockResolvedValue({ ...mockAccount, balance: 50 });
      await expect(service.initiateTransaction('acc-1', 'user-1', {
        type: 'OUTGOING' as any, amount: 100, description: 'X',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ── SIGN TRANSACTION ──

  describe('signTransaction', () => {
    it('should add co-signer signature', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({
        ...mockTx, status: 'PENDING',
        account: { ...mockAccount, clientSignaturesRequired: 2 },
      });
      prisma.orgBankTransaction.update.mockResolvedValue({ ...mockTx, clientApproved: true, status: 'CLIENT_APPROVED' });
      const result = await service.signTransaction('tx-1', 'user-2');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if tx not found', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue(null);
      await expect(service.signTransaction('bad', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if tx is not PENDING', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'COMPLETED' });
      await expect(service.signTransaction('tx-1', 'user-2')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not a member', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({
        ...mockTx, status: 'PENDING',
        account: { ...mockAccount, clientSignaturesRequired: 2 },
      });
      prisma.organizationMember.findUnique.mockResolvedValue(null);
      await expect(service.signTransaction('tx-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already signed', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({
        ...mockTx, status: 'PENDING',
        account: { ...mockAccount, clientSignaturesRequired: 2 },
      });
      await expect(service.signTransaction('tx-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── BANK APPROVE ──

  describe('bankApproveTransaction', () => {
    it('should approve and execute transaction', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'CLIENT_APPROVED' });
      prisma.orgBankTransaction.update.mockResolvedValue({ ...mockTx, status: 'COMPLETED', bankApproved: true });
      const result = await service.bankApproveTransaction('tx-1', 'officer-1', true);
      expect(result.status).toBe('COMPLETED');
    });

    it('should reject transaction', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'CLIENT_APPROVED' });
      prisma.orgBankTransaction.update.mockResolvedValue({ ...mockTx, status: 'REJECTED' });
      const result = await service.bankApproveTransaction('tx-1', 'officer-1', false, 'Suspicious');
      expect(result.status).toBe('REJECTED');
    });

    it('should throw NotFoundException if tx not found', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue(null);
      await expect(service.bankApproveTransaction('bad', 'off-1', true)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not CLIENT_APPROVED', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'PENDING' });
      await expect(service.bankApproveTransaction('tx-1', 'off-1', true)).rejects.toThrow(BadRequestException);
    });
  });

  // ── CANCEL ──

  describe('cancelTransaction', () => {
    it('should cancel a pending transaction', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'PENDING' });
      prisma.orgBankTransaction.update.mockResolvedValue({ ...mockTx, status: 'CANCELLED' });
      const result = await service.cancelTransaction('tx-1', 'user-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw NotFoundException', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue(null);
      await expect(service.cancelTransaction('bad', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not initiator', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'PENDING' });
      await expect(service.cancelTransaction('tx-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for completed tx', async () => {
      prisma.orgBankTransaction.findUnique.mockResolvedValue({ ...mockTx, status: 'COMPLETED', initiatorId: 'user-1' });
      await expect(service.cancelTransaction('tx-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── QUERIES ──

  describe('getAccountTransactions', () => {
    it('should return transactions with pagination', async () => {
      prisma.orgBankTransaction.findMany.mockResolvedValue([mockTx]);
      prisma.orgBankTransaction.count.mockResolvedValue(1);
      const result = await service.getAccountTransactions('acc-1');
      expect(result.transactions).toBeDefined();
      expect(result.total).toBe(1);
    });

    it('should apply status filter', async () => {
      const result = await service.getAccountTransactions('acc-1', { status: 'PENDING' as any });
      expect(result).toBeDefined();
    });
  });

  describe('getPendingTransactions', () => {
    it('should return pending transactions', async () => {
      const result = await service.getPendingTransactions('acc-1');
      expect(result).toBeDefined();
    });
  });

  describe('getOrgAccounts', () => {
    it('should return org accounts', async () => {
      const result = await service.getOrgAccounts('org-1');
      expect(result).toBeDefined();
    });
  });

  // ── DAILY REPORTS ──

  describe('generateDailyReports', () => {
    it('should generate daily reports for active accounts', async () => {
      prisma.orgBankAccount.findMany.mockResolvedValue([mockAccount]);
      prisma.bankDailyReport.findUnique.mockResolvedValue(null); // no existing
      prisma.orgBankTransaction.findMany.mockResolvedValue([
        { ...mockTx, type: 'INCOMING', status: 'COMPLETED', amount: 200 },
        { ...mockTx, type: 'OUTGOING', status: 'COMPLETED', amount: 100 },
      ]);
      prisma.bankDailyReport.create.mockResolvedValue(mockReport);
      const result = await service.generateDailyReports();
      expect(result).toBe(1);
    });

    it('should skip if report already exists', async () => {
      prisma.orgBankAccount.findMany.mockResolvedValue([mockAccount]);
      prisma.bankDailyReport.findUnique.mockResolvedValue(mockReport);
      const result = await service.generateDailyReports();
      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      prisma.orgBankAccount.findMany.mockResolvedValue([mockAccount]);
      prisma.bankDailyReport.findUnique.mockRejectedValue(new Error('DB error'));
      const result = await service.generateDailyReports();
      expect(result).toBe(0);
    });
  });

  describe('getDailyReport', () => {
    it('should return daily report', async () => {
      const result = await service.getDailyReport('acc-1', new Date());
      expect(result).toBeDefined();
    });
  });

  describe('getDailyReports', () => {
    it('should return paginated daily reports', async () => {
      prisma.bankDailyReport.findMany.mockResolvedValue([mockReport]);
      prisma.bankDailyReport.count.mockResolvedValue(1);
      const result = await service.getDailyReports('acc-1', { page: 1, limit: 10 });
      expect(result.reports).toBeDefined();
      expect(result.total).toBe(1);
    });
  });
});
