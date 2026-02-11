import { Test, TestingModule } from '@nestjs/testing';
import { ZagsServiceService } from './zags-service.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ZagsServiceService', () => {
  let service: ZagsServiceService;
  let prisma: any;

  const mockMarriage = {
    id: 'marriage-1',
    certificateNumber: 'CERT-001',
    spouse1Id: 'user-1',
    spouse2Id: 'user-2',
    spouse1FullName: 'Citizen One',
    spouse2FullName: 'Citizen Two',
    status: 'PENDING_CONSENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          civilStatus: 'SINGLE',
        }),
      },
      marriage: {
        create: jest.fn().mockResolvedValue(mockMarriage),
        findUnique: jest.fn().mockResolvedValue(mockMarriage),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockMarriage]),
        update: jest.fn().mockResolvedValue({ ...mockMarriage, status: 'REGISTERED' }),
      },
      marriageConsent: {
        create: jest.fn().mockResolvedValue({ id: 'consent-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      zagsDivorce: {
        create: jest.fn().mockResolvedValue({ id: 'divorce-1', status: 'FILED' }),
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZagsServiceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ZagsServiceService>(ZagsServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkEligibility', () => {
    it('should return eligible for SINGLE user', async () => {
      const result = await service.checkEligibility('user-1');

      expect(result).toBeDefined();
      expect(result.isEligible).toBe(true);
    });

    it('should return ineligible for user with active marriage', async () => {
      prisma.marriage.findFirst = jest.fn().mockResolvedValue({
        id: 'marriage-1',
        status: 'REGISTERED',
      });

      const result = await service.checkEligibility('user-1');

      expect(result.isEligible).toBe(false);
    });
  });

  describe('getMyMarriages', () => {
    it('should return marriages for user', async () => {
      const result = await service.getMyMarriages('user-1');

      expect(prisma.marriage.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('verifyCertificate', () => {
    it('should return invalid for nonexistent certificate', async () => {
      prisma.marriage.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.verifyCertificate('NONEXISTENT');

      expect(result.isValid).toBe(false);
    });
  });
});
