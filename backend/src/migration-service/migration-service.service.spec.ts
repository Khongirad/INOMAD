import { Test, TestingModule } from '@nestjs/testing';
import { MigrationServiceService } from './migration-service.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MigrationServiceService', () => {
  let service: MigrationServiceService;
  let prisma: any;

  const mockApplication = {
    id: 'app-1',
    applicantId: 'user-1',
    fullName: 'Test Citizen',
    dateOfBirth: new Date('1990-01-01'),
    placeOfBirth: 'Ulaanbaatar',
    nationality: 'Mongol',
    sex: 'Male',
    address: '123 Test Street',
    city: 'Ulaanbaatar',
    region: 'Central',
    passportType: 'STANDARD',
    status: 'DRAFT',
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      passportApplication: {
        create: jest.fn().mockResolvedValue(mockApplication),
        findUnique: jest.fn().mockResolvedValue(mockApplication),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockApplication]),
        update: jest.fn().mockResolvedValue({ ...mockApplication, status: 'SUBMITTED', submittedAt: new Date() }),
      },
      passportDocument: {
        create: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationServiceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MigrationServiceService>(MigrationServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createApplication', () => {
    it('should create a passport application', async () => {
      const result = await service.createApplication('user-1', {
        fullName: 'Test Citizen',
        dateOfBirth: '1990-01-01',
        placeOfBirth: 'Ulaanbaatar',
        nationality: 'Mongol',
        sex: 'Male',
        address: '123 Test Street',
        city: 'Ulaanbaatar',
        region: 'Central',
      });

      expect(prisma.passportApplication.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.fullName).toBe('Test Citizen');
    });
  });

  describe('getMyApplications', () => {
    it('should return applications for user', async () => {
      const result = await service.getMyApplications('user-1');

      expect(prisma.passportApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { applicantId: 'user-1' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('submitApplication', () => {
    it('should update status to SUBMITTED', async () => {
      const result = await service.submitApplication('user-1', 'app-1');

      expect(prisma.passportApplication.findUnique).toHaveBeenCalled();
      expect(prisma.passportApplication.update).toHaveBeenCalled();
      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('lookupPassport', () => {
    it('should return exists: false for unknown passport', async () => {
      const result = await service.lookupPassport('NONEXISTENT-123');

      expect(prisma.passportApplication.findFirst).toHaveBeenCalled();
      expect(result.exists).toBe(false);
    });
  });
});
