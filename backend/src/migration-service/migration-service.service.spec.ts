import { Test, TestingModule } from '@nestjs/testing';
import { MigrationServiceService } from './migration-service.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MigrationServiceService', () => {
  let service: MigrationServiceService;
  let prisma: any;

  const mockApp = {
    id: 'app1', applicantId: 'u1', fullName: 'John Doe',
    dateOfBirth: new Date('1990-01-01'), placeOfBirth: 'Moscow',
    nationality: 'Siberian', sex: 'M', height: 180, eyeColor: 'brown',
    fatherName: 'Dad', motherName: 'Mom', address: '123 Main',
    city: 'Novosibirsk', region: 'Siberia', postalCode: '630000',
    passportType: 'STANDARD', previousPassportNumber: null,
    status: 'DRAFT', submittedAt: null, reviewedAt: null,
    reviewedBy: null, reviewNotes: null,
    issuedPassportNumber: null, issuedAt: null, expiresAt: null,
    createdAt: new Date(), documents: [],
  };

  const mockDoc = {
    id: 'd1', applicationId: 'app1', type: 'PHOTO',
    filename: 'photo.jpg', mimeType: 'image/jpeg',
    size: 1000, storagePath: '/uploads/photo.jpg',
  };

  beforeEach(async () => {
    const mockPrisma = {
      passportApplication: {
        create: jest.fn().mockResolvedValue(mockApp),
        findUnique: jest.fn().mockResolvedValue(mockApp),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockApp]),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockApp, ...data }),
        ),
      },
      passportDocument: {
        create: jest.fn().mockResolvedValue(mockDoc),
        findMany: jest.fn().mockResolvedValue([mockDoc]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationServiceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(MigrationServiceService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createApplication', () => {
    it('creates passport application', async () => {
      const r = await service.createApplication('u1', {
        fullName: 'John Doe', dateOfBirth: '1990-01-01',
        placeOfBirth: 'Moscow', nationality: 'Siberian', sex: 'M',
        address: '123 Main', city: 'Novosibirsk', region: 'Siberia',
      });
      expect(r.id).toBe('app1');
      expect(prisma.passportApplication.create).toHaveBeenCalled();
    });
    it('creates with all optional fields', async () => {
      await service.createApplication('u1', {
        fullName: 'John', dateOfBirth: '1990-01-01',
        placeOfBirth: 'Moscow', nationality: 'SB', sex: 'M',
        address: 'Main', city: 'NSK', region: 'SB',
        height: 180, eyeColor: 'brown', fatherName: 'Dad',
        motherName: 'Mom', postalCode: '630000',
        passportType: 'DIPLOMATIC', previousPassportNumber: 'OLD-123',
      });
      expect(prisma.passportApplication.create).toHaveBeenCalled();
    });
  });

  describe('submitApplication', () => {
    it('submits draft application', async () => {
      const r = await service.submitApplication('u1', 'app1');
      expect(r.status).toBe('SUBMITTED');
    });
    it('throws when not found', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue(null);
      await expect(service.submitApplication('u1', 'bad')).rejects.toThrow('not found');
    });
    it('throws when not owner', async () => {
      await expect(service.submitApplication('other', 'app1')).rejects.toThrow('Not your');
    });
    it('throws when already submitted', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue({
        ...mockApp, status: 'SUBMITTED',
      });
      await expect(service.submitApplication('u1', 'app1')).rejects.toThrow('already submitted');
    });
  });

  describe('getMyApplications', () => {
    it('returns user applications', async () => {
      const r = await service.getMyApplications('u1');
      expect(r).toHaveLength(1);
    });
  });

  describe('getApplicationById', () => {
    it('returns application', async () => {
      const r = await service.getApplicationById('app1');
      expect(r.id).toBe('app1');
    });
    it('throws when not found', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue(null);
      await expect(service.getApplicationById('bad')).rejects.toThrow('not found');
    });
  });

  describe('getDocuments', () => {
    it('returns documents', async () => {
      const r = await service.getDocuments('app1');
      expect(r).toHaveLength(1);
    });
  });

  describe('uploadDocument', () => {
    it('uploads document', async () => {
      const r = await service.uploadDocument('app1', {
        type: 'PHOTO', filename: 'photo.jpg',
        mimeType: 'image/jpeg', size: 1000,
        storagePath: '/uploads/photo.jpg',
      });
      expect(r.id).toBe('d1');
    });
    it('throws when application not found', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue(null);
      await expect(service.uploadDocument('bad', {
        type: 'PHOTO', filename: 'x.jpg',
        mimeType: 'image/jpeg', size: 100,
        storagePath: '/x',
      })).rejects.toThrow('not found');
    });
  });

  describe('lookupPassport', () => {
    it('returns not found for unknown passport', async () => {
      const r = await service.lookupPassport('UNKNOWN');
      expect(r.exists).toBe(false);
    });
    it('returns found passport', async () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 5);
      prisma.passportApplication.findFirst.mockResolvedValue({
        ...mockApp, issuedPassportNumber: 'SC-123', expiresAt: future,
        status: 'ISSUED',
      });
      const r = await service.lookupPassport('SC-123');
      expect(r.exists).toBe(true);
      expect((r as any).isValid).toBe(true);
    });
    it('returns expired passport', async () => {
      const past = new Date('2020-01-01');
      prisma.passportApplication.findFirst.mockResolvedValue({
        ...mockApp, issuedPassportNumber: 'SC-OLD', expiresAt: past,
        status: 'ISSUED',
      });
      const r = await service.lookupPassport('SC-OLD');
      expect(r.exists).toBe(true);
      expect((r as any).isValid).toBe(false);
    });
  });

  describe('getAllApplications', () => {
    it('returns all applications', async () => {
      const r = await service.getAllApplications();
      expect(r).toHaveLength(1);
    });
  });

  describe('getPendingApplications', () => {
    it('returns pending applications', async () => {
      const r = await service.getPendingApplications();
      expect(r).toHaveLength(1);
    });
  });

  describe('reviewApplication', () => {
    it('approves application', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue({
        ...mockApp, status: 'SUBMITTED',
      });
      const r = await service.reviewApplication('app1', 'rev1', {
        decision: 'APPROVE', passportNumber: 'SC-NEW-123',
      });
      expect(r.status).toBe('ISSUED');
    });
    it('approves without provided passport number', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue({
        ...mockApp, status: 'UNDER_REVIEW',
      });
      const r = await service.reviewApplication('app1', 'rev1', {
        decision: 'APPROVE',
      });
      expect(r.status).toBe('ISSUED');
    });
    it('rejects application', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue({
        ...mockApp, status: 'SUBMITTED',
      });
      const r = await service.reviewApplication('app1', 'rev1', {
        decision: 'REJECT', notes: 'Missing documents',
      });
      expect(r.status).toBe('REJECTED');
    });
    it('throws when not found', async () => {
      prisma.passportApplication.findUnique.mockResolvedValue(null);
      await expect(service.reviewApplication('bad', 'rev1', {
        decision: 'APPROVE',
      })).rejects.toThrow('not found');
    });
    it('throws when not in reviewable state', async () => {
      await expect(service.reviewApplication('app1', 'rev1', {
        decision: 'APPROVE',
      })).rejects.toThrow('not in reviewable');
    });
  });
});
