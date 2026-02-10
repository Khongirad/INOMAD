import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankService } from './central-bank.service';
import { PrismaService } from '../prisma/prisma.service';

// Decimal-like mock
const d = (v: number) => ({ equals: (o: number) => v === o, toNumber: () => v, toString: () => String(v) });

describe('CentralBankService', () => {
  let service: CentralBankService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      corrAccount: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      emissionRecord: {
        create: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      },
      centralBankLicense: {
        findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'lic-1' }),
        update: jest.fn(), count: jest.fn().mockResolvedValue(5),
      },
      monetaryPolicy: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      monetaryPolicyChange: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CentralBankService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<CentralBankService>(CentralBankService);
  });

  it('getEmissionHistory returns records', async () => {
    const r = await service.getEmissionHistory();
    expect(prisma.emissionRecord.findMany).toHaveBeenCalled();
  });

  it('getLicensedBanks returns banks', async () => {
    const r = await service.getLicensedBanks();
    expect(prisma.centralBankLicense.findMany).toHaveBeenCalled();
  });

  it('getCorrAccounts returns accounts', async () => {
    const r = await service.getCorrAccounts();
    expect(prisma.corrAccount.findMany).toHaveBeenCalled();
  });

  it('getPolicyHistory returns changes', async () => {
    const r = await service.getPolicyHistory();
    expect(prisma.monetaryPolicyChange.findMany).toHaveBeenCalled();
  });
});
