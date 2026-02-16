import { Test, TestingModule } from '@nestjs/testing';
import { CitizenAllocationService } from './citizen-allocation.service';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';

describe('CitizenAllocationService', () => {
  let service: CitizenAllocationService;
  let prisma: any;
  let bankReward: any;

  const mockPensionFund = { id: 'pf1', email: 'pension@system.khural' };
  const mockBankLink = { userId: 'u1', bankRef: 'BOS-001', status: 'ACTIVE' };
  const mockUser = { id: 'u1', seatId: 'SEAT-001', bankLink: mockBankLink };

  beforeEach(async () => {
    const mockPrisma = {
      bankLink: {
        findUnique: jest.fn().mockResolvedValue(mockBankLink),
        create: jest.fn().mockResolvedValue(mockBankLink),
      },
      altanLedger: {
        upsert: jest.fn().mockResolvedValue({ userId: 'u1', balance: 0 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        findFirst: jest.fn().mockResolvedValue(mockPensionFund),
      },
      altanTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      familyArban: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      orgArbanMember: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      zun: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const mockBankRewardService = {
      transferReward: jest.fn().mockResolvedValue({ transactionId: 'tx1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenAllocationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BankRewardService, useValue: mockBankRewardService },
      ],
    }).compile();
    service = module.get(CitizenAllocationService);
    prisma = module.get(PrismaService);
    bankReward = module.get(BankRewardService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createCitizenBankAccount', () => {
    it('returns existing when already has account', async () => {
      const r = await service.createCitizenBankAccount('u1');
      expect(r.alreadyExists).toBe(true);
      expect(r.accountCreated).toBe(false);
    });
    it('creates new bank account', async () => {
      prisma.bankLink.findUnique.mockResolvedValue(null);
      const r = await service.createCitizenBankAccount('u1');
      expect(r.accountCreated).toBe(true);
      expect(prisma.bankLink.create).toHaveBeenCalled();
      expect(prisma.altanLedger.upsert).toHaveBeenCalled();
    });
  });

  describe('allocateLevel1Funds', () => {
    it('allocates level 1 funds', async () => {
      const r = await service.allocateLevel1Funds('u1', 'SEAT-001');
      expect(r.allocated).toBe(true);
      expect(r.amount).toBe(100);
      expect(bankReward.transferReward).toHaveBeenCalled();
    });
    it('throws when no bank account', async () => {
      prisma.bankLink.findUnique.mockResolvedValue(null);
      await expect(service.allocateLevel1Funds('u1', 'SEAT-001')).rejects.toThrow('No bank account');
    });
    it('throws when pension fund not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.allocateLevel1Funds('u1', 'SEAT-001')).rejects.toThrow('Pension Fund');
    });
  });

  describe('allocateLevel2Funds', () => {
    it('skips when already allocated', async () => {
      prisma.altanTransaction.findFirst.mockResolvedValue({ id: 'existing' });
      const r = await service.allocateLevel2Funds('u1', 'arban1');
      expect(r.allocated).toBe(false);
      expect(r.amount).toBe(0);
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.allocateLevel2Funds('u1', 'arban1')).rejects.toThrow('not found');
    });
    it('throws when not arban member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-001' });
      await expect(service.allocateLevel2Funds('u1', '99999')).rejects.toThrow('not a member');
    });
    it('allocates when member via family arban (husband)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-001' });
      prisma.familyArban.findUnique.mockResolvedValue({
        husbandSeatId: 'SEAT-001', wifeSeatId: 'SEAT-002', children: [],
      });
      const r = await service.allocateLevel2Funds('u1', '10001');
      expect(r.allocated).toBe(true);
      expect(r.amount).toBe(5000);
    });
    it('allocates when member via family arban (wife)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-002' });
      prisma.familyArban.findUnique.mockResolvedValue({
        husbandSeatId: 'SEAT-001', wifeSeatId: 'SEAT-002', children: [],
      });
      const r = await service.allocateLevel2Funds('u1', '10001');
      expect(r.allocated).toBe(true);
    });
    it('allocates when member via family arban (child)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-003' });
      prisma.familyArban.findUnique.mockResolvedValue({
        husbandSeatId: 'SEAT-001', wifeSeatId: 'SEAT-002',
        children: [{ childSeatId: 'SEAT-003' }],
      });
      const r = await service.allocateLevel2Funds('u1', '10001');
      expect(r.allocated).toBe(true);
    });
    it('allocates when member via org arban', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-001' });
      prisma.orgArbanMember.findFirst.mockResolvedValue({ seatId: 'SEAT-001' });
      const r = await service.allocateLevel2Funds('u1', '12345');
      expect(r.allocated).toBe(true);
    });
    it('throws when pension fund not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-001' });
      prisma.familyArban.findUnique.mockResolvedValue({
        husbandSeatId: 'SEAT-001', wifeSeatId: null, children: [],
      });
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.allocateLevel2Funds('u1', '10001')).rejects.toThrow('Pension Fund');
    });
  });

  describe('allocateLevel3Funds', () => {
    it('skips when already allocated', async () => {
      prisma.altanTransaction.findFirst.mockResolvedValue({ id: 'existing' });
      const r = await service.allocateLevel3Funds('u1', 'zun1');
      expect(r.allocated).toBe(false);
    });
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.allocateLevel3Funds('u1', 'zun1')).rejects.toThrow('not found');
    });
    it('throws when not zun member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-001' });
      await expect(service.allocateLevel3Funds('u1', 'zun1')).rejects.toThrow('not a member');
    });
    it('allocates for zun member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-001' });
      prisma.zun.findUnique.mockResolvedValue({
        id: 'zun1',
        memberArbans: [
          { husbandSeatId: 'SEAT-001', wifeSeatId: null, children: [] },
        ],
      });
      const r = await service.allocateLevel3Funds('u1', 'zun1');
      expect(r.allocated).toBe(true);
      expect(r.amount).toBe(9383);
    });
  });

  describe('getAllocationSummary', () => {
    it('returns empty when no bank account', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', bankLink: null });
      const r = await service.getAllocationSummary('u1');
      expect(r.level1Received).toBe(false);
      expect(r.totalReceived).toBe(0);
    });
    it('returns summary with levels', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.altanTransaction.findMany.mockResolvedValue([
        { memo: 'Verification Award - Level 1' },
        { memo: 'Verification Award - Level 2' },
      ]);
      const r = await service.getAllocationSummary('u1');
      expect(r.level1Received).toBe(true);
      expect(r.level2Received).toBe(true);
      expect(r.level3Received).toBe(false);
      expect(r.totalReceived).toBe(5100);
    });
  });

  describe('verifyArbanMembership (private)', () => {
    it('returns false when user has no seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: null });
      const r = await (service as any).verifyArbanMembership('u1', '99999');
      expect(r).toBe(false);
    });
  });

  describe('verifyZunMembership (private)', () => {
    it('returns false when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const r = await (service as any).verifyZunMembership('u1', 'zun1');
      expect(r).toBe(false);
    });
    it('returns false when zun has no member arbans', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'S1' });
      prisma.zun.findUnique.mockResolvedValue({ memberArbans: [] });
      const r = await (service as any).verifyZunMembership('u1', 'zun1');
      expect(r).toBe(false);
    });
    it('returns false when zun not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'S1' });
      prisma.zun.findUnique.mockResolvedValue(null);
      const r = await (service as any).verifyZunMembership('u1', 'zun1');
      expect(r).toBe(false);
    });
  });
});
