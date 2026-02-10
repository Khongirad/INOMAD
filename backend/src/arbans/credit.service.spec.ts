import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CreditService', () => {
  let service: CreditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      creditLine: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      loan: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      familyArban: { findUnique: jest.fn() },
      organizationalArban: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<CreditService>(CreditService);
  });

  it('getCreditLine returns credit line', async () => {
    prisma.creditLine.findUnique.mockResolvedValue({
      id: 'cl1', arbanId: 1, creditType: 'FAMILY',
      borrowed: '0', creditLimit: '1000000', interestRate: 500,
      totalBorrowed: '0', totalRepaid: '0', defaultCount: 0, onTimeCount: 0,
      isActive: true, createdAt: new Date(),
    });
    const r = await service.getCreditLine(1, 'FAMILY');
    expect(r).toBeDefined();
  });

  it('getLoans returns loan list', async () => {
    const r = await service.getLoans(1, 'FAMILY');
    expect(prisma.loan.findMany).toHaveBeenCalled();
  });
});
