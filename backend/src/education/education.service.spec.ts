import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EducationService } from './education.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EducationService', () => {
  let service: EducationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      educationVerification: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EducationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<EducationService>(EducationService);
  });

  describe('submitEducation', () => {
    it('should reject recommendation without recommender', async () => {
      await expect(service.submitEducation({
        userId: 'u1', type: 'RECOMMENDATION' as any, institution: 'MIT', fieldOfStudy: 'CS',
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject if recommender lacks education', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null);
      await expect(service.submitEducation({
        userId: 'u1', type: 'RECOMMENDATION' as any, institution: 'MIT', fieldOfStudy: 'CS', recommenderId: 'r1',
      })).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate pending verification', async () => {
      prisma.educationVerification.findFirst
        .mockResolvedValueOnce({ id: 'rec' }) // recommender check
        .mockResolvedValueOnce({ id: 'existing' }); // existing check
      await expect(service.submitEducation({
        userId: 'u1', type: 'RECOMMENDATION' as any, institution: 'MIT', fieldOfStudy: 'CS', recommenderId: 'r1',
      })).rejects.toThrow(BadRequestException);
    });

    it('should create diploma submission', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null);
      prisma.educationVerification.create.mockResolvedValue({ id: 'ev-1', isVerified: false });
      const result = await service.submitEducation({
        userId: 'u1', type: 'DIPLOMA' as any, institution: 'MIT', fieldOfStudy: 'CS',
      });
      expect(result.id).toBe('ev-1');
    });
  });

  describe('verifyEducation', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue(null);
      await expect(service.verifyEducation({ verificationId: 'bad', adminId: 'a1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if already verified', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue({ id: 'ev-1', isVerified: true });
      await expect(service.verifyEducation({ verificationId: 'ev-1', adminId: 'a1' })).rejects.toThrow(BadRequestException);
    });

    it('should verify education', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue({ id: 'ev-1', isVerified: false });
      prisma.educationVerification.update.mockResolvedValue({ id: 'ev-1', isVerified: true });
      const result = await service.verifyEducation({ verificationId: 'ev-1', adminId: 'a1' });
      expect(result.isVerified).toBe(true);
    });
  });

  describe('rejectEducation', () => {
    it('should throw NotFoundException if not found', async () => {
      prisma.educationVerification.findUnique.mockResolvedValue(null);
      await expect(service.rejectEducation('bad', 'a1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasVerifiedEducation', () => {
    it('should return true when verified record exists', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue({ id: 'ev-1' });
      expect(await service.hasVerifiedEducation('u1', 'CS')).toBe(true);
    });

    it('should return false when no verification', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null);
      expect(await service.hasVerifiedEducation('u1')).toBe(false);
    });
  });

  describe('getUserEducation', () => {
    it('should return education list for user', async () => {
      await service.getUserEducation('u1');
      expect(prisma.educationVerification.findMany).toHaveBeenCalled();
    });
  });
});
