import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankService } from './central-bank.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CentralBankService', () => {
  let service: CentralBankService;
  let prisma: any;

  const mockPolicy = {
    id: 'pol-1', officialRate: 0.5, reserveRequirement: 0.1,
    dailyEmissionLimit: 10000000, isActive: true,
    effectiveFrom: new Date(), createdAt: new Date(),
  };

  const mockCorrAccount = {
    id: 'corr-1', accountRef: 'CORR:BANK1:12345678',
    balance: 1000, licenseId: 'lic-1',
    license: { id: 'lic-1', bankCode: 'BANK1', bankName: 'Test Bank', status: 'ACTIVE' },
    updatedAt: new Date(), createdAt: new Date(),
  };

  const mockLicense = {
    id: 'lic-1', bankAddress: '0xabc', bankCode: 'BANK1', bankName: 'Test Bank',
    status: 'ACTIVE', issuedAt: new Date(), revokedAt: null, revokeReason: null,
    issuedById: 'officer-1',
    corrAccount: { id: 'corr-1', accountRef: 'CORR:BANK1:12345678', balance: 1000 },
    issuedBy: { name: 'Officer A', role: 'CENTRAL_BANK_OFFICER' },
  };

  const mockEmission = {
    id: 'em-1', type: 'MINT', amount: 500, reason: 'Test',
    memo: null, status: 'COMPLETED', createdAt: new Date(),
    corrAccount: { license: { bankCode: 'BANK1', bankName: 'Test Bank' } },
    authorizedBy: { name: 'Officer A', role: 'OFFICER', walletAddress: '0xabc' },
  };

  const baseMock = (val: any = null) => ({
    findUnique: jest.fn().mockResolvedValue(val),
    findFirst: jest.fn().mockResolvedValue(val),
    findMany: jest.fn().mockResolvedValue(val ? [val] : []),
    create: jest.fn().mockResolvedValue(val),
    update: jest.fn().mockResolvedValue(val),
    count: jest.fn().mockResolvedValue(3),
    aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
  });

  beforeEach(async () => {
    prisma = {
      corrAccount: baseMock(mockCorrAccount),
      emissionRecord: baseMock(mockEmission),
      centralBankLicense: baseMock(mockLicense),
      monetaryPolicy: baseMock(mockPolicy),
      monetaryPolicyChange: baseMock({ id: 'chg-1', parameter: 'officialRate', previousValue: '0', newValue: '0.5', reason: 'Initial', authorizedBy: { name: 'Officer' }, effectiveAt: new Date(), createdAt: new Date() }),
      altanTransaction: baseMock(null),
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralBankService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CentralBankService>(CentralBankService);
  });

  it('should be defined', () => { expect(service).toBeDefined(); });

  // ── EMISSION & BURNING ──

  describe('emitToCorrespondentAccount', () => {
    it('should emit ALTAN to corr account', async () => {
      // getActivePolicy → policy with high limit; getTodayEmissionTotal → low usage
      prisma.emissionRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 500 } })  // getTotalSupply (MINT)
        .mockResolvedValueOnce({ _sum: { amount: 0 } })    // getTotalSupply (BURN)
        .mockResolvedValueOnce({ _sum: { amount: 100 } }); // getTodayEmissionTotal
      prisma.corrAccount.update.mockResolvedValue({ ...mockCorrAccount, balance: 1500 });
      prisma.emissionRecord.create.mockResolvedValue({ id: 'em-new', type: 'MINT', amount: 500 });

      const result = await service.emitToCorrespondentAccount('off-1', 'corr-1', 500, 'Test emission');
      expect(result.emissionId).toBe('em-new');
      expect(result.amount).toBe('500');
    });

    it('should throw BadRequestException for non-positive amount', async () => {
      await expect(service.emitToCorrespondentAccount('off-1', 'corr-1', 0, 'X')).rejects.toThrow(BadRequestException);
      await expect(service.emitToCorrespondentAccount('off-1', 'corr-1', -5, 'X')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent corr account', async () => {
      prisma.corrAccount.findUnique.mockResolvedValue(null);
      await expect(service.emitToCorrespondentAccount('off-1', 'bad', 100, 'X')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if license is not ACTIVE', async () => {
      prisma.corrAccount.findUnique.mockResolvedValue({
        ...mockCorrAccount, license: { ...mockCorrAccount.license, status: 'SUSPENDED' },
      });
      await expect(service.emitToCorrespondentAccount('off-1', 'corr-1', 100, 'X')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if daily limit exceeded', async () => {
      prisma.emissionRecord.aggregate.mockResolvedValue({ _sum: { amount: 9999999 } }); // near limit
      await expect(service.emitToCorrespondentAccount('off-1', 'corr-1', 500, 'X')).rejects.toThrow(BadRequestException);
    });
  });

  describe('burnFromCorrespondentAccount', () => {
    it('should burn ALTAN from corr account', async () => {
      prisma.corrAccount.update.mockResolvedValue({ ...mockCorrAccount, balance: 500 });
      prisma.emissionRecord.create.mockResolvedValue({ id: 'em-burn', type: 'BURN', amount: 500 });

      const result = await service.burnFromCorrespondentAccount('off-1', 'corr-1', 500, 'Test burn');
      expect(result.emissionId).toBe('em-burn');
    });

    it('should throw BadRequestException for non-positive amount', async () => {
      await expect(service.burnFromCorrespondentAccount('off-1', 'corr-1', -1, 'X')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent corr account', async () => {
      prisma.corrAccount.findUnique.mockResolvedValue(null);
      await expect(service.burnFromCorrespondentAccount('off-1', 'bad', 100, 'X')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      prisma.corrAccount.findUnique.mockResolvedValue({ ...mockCorrAccount, balance: 50 });
      await expect(service.burnFromCorrespondentAccount('off-1', 'corr-1', 100, 'X')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmissionHistory', () => {
    it('should return emission history', async () => {
      const result = await service.getEmissionHistory();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('MINT');
    });

    it('should return empty for no records', async () => {
      prisma.emissionRecord.findMany.mockResolvedValue([]);
      const result = await service.getEmissionHistory(10, 0);
      expect(result).toEqual([]);
    });
  });

  describe('getTotalSupply', () => {
    it('should return supply stats', async () => {
      prisma.emissionRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 200 } });
      const result = await service.getTotalSupply();
      expect(result.minted).toBe('1000.000000');
      expect(result.burned).toBe('200.000000');
      expect(result.circulating).toBe('800.000000');
    });

    it('should return zeros for no records', async () => {
      prisma.emissionRecord.aggregate.mockResolvedValue({ _sum: { amount: null } });
      const result = await service.getTotalSupply();
      expect(result.circulating).toBe('0.000000');
    });
  });

  describe('getDailyEmissionUsage', () => {
    it('should return usage info', async () => {
      prisma.emissionRecord.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
      const result = await service.getDailyEmissionUsage();
      expect(result.used).toBeDefined();
      expect(result.limit).toBeDefined();
      expect(result.remaining).toBeDefined();
    });
  });

  // ── LICENSING ──

  describe('issueLicense', () => {
    it('should issue a new license with corr account', async () => {
      prisma.centralBankLicense.findFirst.mockResolvedValue(null);
      prisma.centralBankLicense.create.mockResolvedValue(mockLicense);
      prisma.corrAccount.create.mockResolvedValue({ id: 'corr-new', accountRef: 'CORR:BANK1:xxx', balance: 0 });

      const result = await service.issueLicense('off-1', '0xabc', 'BANK1', 'Test Bank');
      expect(result.license.bankCode).toBe('BANK1');
      expect(result.corrAccount.balance).toBe('0');
    });

    it('should throw BadRequestException if license already exists', async () => {
      prisma.centralBankLicense.findFirst.mockResolvedValue(mockLicense);
      await expect(service.issueLicense('off-1', '0xabc', 'BANK1', 'Test Bank')).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeLicense', () => {
    it('should revoke an active license', async () => {
      prisma.centralBankLicense.findUnique.mockResolvedValue(mockLicense);
      await service.revokeLicense('off-1', 'lic-1', 'Violation');
      expect(prisma.centralBankLicense.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'REVOKED' }),
      }));
    });

    it('should throw NotFoundException if license not found', async () => {
      prisma.centralBankLicense.findUnique.mockResolvedValue(null);
      await expect(service.revokeLicense('off-1', 'bad', 'X')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already revoked', async () => {
      prisma.centralBankLicense.findUnique.mockResolvedValue({ ...mockLicense, status: 'REVOKED' });
      await expect(service.revokeLicense('off-1', 'lic-1', 'X')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLicensedBanks', () => {
    it('should return licensed banks list', async () => {
      const result = await service.getLicensedBanks();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bankCode).toBe('BANK1');
    });
  });

  describe('getCorrAccounts', () => {
    it('should return correspondent accounts', async () => {
      prisma.corrAccount.findMany.mockResolvedValue([mockCorrAccount]);
      const result = await service.getCorrAccounts();
      expect(result.length).toBe(1);
      expect(result[0].bankCode).toBe('BANK1');
    });
  });

  // ── MONETARY POLICY ──

  describe('getCurrentPolicy', () => {
    it('should return active policy', async () => {
      const result = await service.getCurrentPolicy();
      expect(result.officialRate).toBeDefined();
    });

    it('should return defaults if no active policy', async () => {
      prisma.monetaryPolicy.findFirst.mockResolvedValue(null);
      const result = await service.getCurrentPolicy();
      expect(result.officialRate).toBe('0.0000');
      expect(result.reserveRequirement).toBe('0.1000');
    });
  });

  describe('updatePolicy', () => {
    it('should update policy and record changes', async () => {
      prisma.monetaryPolicy.create.mockResolvedValue({
        ...mockPolicy, id: 'pol-2', officialRate: 0.75, effectiveFrom: new Date(),
      });

      const result = await service.updatePolicy('off-1', { officialRate: 0.75 }, 'Adjustment');
      expect(result.officialRate).toBe('0.75');
      expect(prisma.monetaryPolicyChange.create).toHaveBeenCalled();
    });

    it('should handle update with no prior policy', async () => {
      prisma.monetaryPolicy.findFirst.mockResolvedValue(null);
      prisma.monetaryPolicy.create.mockResolvedValue({
        ...mockPolicy, id: 'pol-new', officialRate: 1.0, reserveRequirement: 0.2,
        dailyEmissionLimit: 5000000, effectiveFrom: new Date(),
      });

      const result = await service.updatePolicy('off-1', {
        officialRate: 1.0, reserveRequirement: 0.2, dailyEmissionLimit: 5000000,
      }, 'Initial policy');
      expect(result).toBeDefined();
    });
  });

  describe('getPolicyHistory', () => {
    it('should return policy change history', async () => {
      const result = await service.getPolicyHistory();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── PUBLIC STATS ──

  describe('getPublicStats', () => {
    it('should return public stats', async () => {
      prisma.emissionRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 200 } });
      prisma.emissionRecord.findFirst.mockResolvedValue({ createdAt: new Date() });

      const result = await service.getPublicStats();
      expect(result.totalSupply).toBeDefined();
      expect(result.licensedBanksCount).toBe(3);
      expect(result.officialRate).toBeDefined();
    });
  });
});
