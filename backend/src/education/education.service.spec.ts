import { Test, TestingModule } from '@nestjs/testing';
import { EducationService } from './education.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('EducationService', () => {
  let service: EducationService;
  let prisma: any;

  const mockVerification = {
    id: 'ev-1', userId: 'u1', type: 'DIPLOMA', institution: 'MIT',
    fieldOfStudy: 'Computer Science', isVerified: false,
    user: { id: 'u1' }, recommender: null,
  };

  const mockPrisma = () => ({
    educationVerification: {
      create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
      findMany: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EducationService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(EducationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── submitEducation ───────────────────
  describe('submitEducation', () => {
    it('should submit diploma verification', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null); // no existing
      prisma.educationVerification.create.mockResolvedValue(mockVerification);
      const result = await service.submitEducation({
        userId: 'u1', type: 'DIPLOMA' as any, institution: 'MIT',
        fieldOfStudy: 'Computer Science',
      });
      expect(result.type).toBe('DIPLOMA');
    });

    it('should throw if RECOMMENDATION without recommender', async () => {
      await expect(service.submitEducation({
        userId: 'u1', type: 'RECOMMENDATION' as any, institution: 'MIT',
        fieldOfStudy: 'CS',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if recommender lacks verified education', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null); // recommender check
      await expect(service.submitEducation({
        userId: 'u1', type: 'RECOMMENDATION' as any, institution: 'MIT',
        fieldOfStudy: 'CS', recommenderId: 'rec-1',
      })).rejects.toThrow(ForbiddenException);
    });

    it('should throw if pending verification exists', async () => {
      // First findFirst for recommender (skipped for DIPLOMA), second for existing
      prisma.educationVerification.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.submitEducation({
        userId: 'u1', type: 'DIPLOMA' as any, institution: 'MIT',
        fieldOfStudy: 'CS',
      })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── verifyEducation ───────────────────
  describe('verifyEducation', () => {
    it('should verify education', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue(mockVerification);
      prisma.educationVerification.update.mockResolvedValue({ ...mockVerification, isVerified: true });
      const result = await service.verifyEducation({ verificationId: 'ev-1', adminId: 'admin' });
      expect(result.isVerified).toBe(true);
    });

    it('should throw NotFoundException', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue(null);
      await expect(service.verifyEducation({ verificationId: 'bad', adminId: 'admin' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw if already verified', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue({ ...mockVerification, isVerified: true });
      await expect(service.verifyEducation({ verificationId: 'ev-1', adminId: 'admin' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ─── rejectEducation ───────────────────
  describe('rejectEducation', () => {
    it('should delete rejected verification', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue(mockVerification);
      prisma.educationVerification.delete.mockResolvedValue({});
      await service.rejectEducation('ev-1', 'admin');
      expect(prisma.educationVerification.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue(null);
      await expect(service.rejectEducation('bad', 'admin')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── hasVerifiedEducation ──────────────
  describe('hasVerifiedEducation', () => {
    it('should return true for verified education', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue({ id: 'ev-1' });
      const result = await service.hasVerifiedEducation('u1', 'CS');
      expect(result).toBe(true);
    });

    it('should return false when none found', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null);
      const result = await service.hasVerifiedEducation('u1', 'Physics');
      expect(result).toBe(false);
    });
  });

  // ─── getUserEducation ──────────────────
  describe('getUserEducation', () => {
    it('should return user education list', async () => {
      prisma.educationVerification.findMany.mockResolvedValue([mockVerification]);
      const result = await service.getUserEducation('u1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── getPendingVerifications ───────────
  describe('getPendingVerifications', () => {
    it('should return pending verifications', async () => {
      prisma.educationVerification.findMany.mockResolvedValue([mockVerification]);
      const result = await service.getPendingVerifications();
      expect(result).toHaveLength(1);
    });
  });

  // ─── getVerifiedSpecialists ────────────
  describe('getVerifiedSpecialists', () => {
    it('should return specialists as users', async () => {
      prisma.educationVerification.findMany.mockResolvedValue([
        { user: { id: 'u1', username: 'alice' } },
      ]);
      const result = await service.getVerifiedSpecialists('CS');
      expect(result[0].username).toBe('alice');
    });
  });
});
