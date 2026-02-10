import { Test, TestingModule } from '@nestjs/testing';
import { ZunService } from './zun.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitizenAllocationService } from '../identity/citizen-allocation.service';

describe('ZunService', () => {
  let service: ZunService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      familyArban: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      zun: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    const allocation = { allocateLevel2: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZunService,
        { provide: PrismaService, useValue: prisma },
        { provide: CitizenAllocationService, useValue: allocation },
      ],
    }).compile();
    service = module.get<ZunService>(ZunService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
