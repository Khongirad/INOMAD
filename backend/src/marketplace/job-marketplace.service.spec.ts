import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobMarketplaceService } from './job-marketplace.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JobMarketplaceService', () => {
  let service: JobMarketplaceService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      job: {
        create: jest.fn().mockResolvedValue({ id: 'job-1', status: 'OPEN' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(5),
      },
      jobApplication: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'app-1', status: 'PENDING' }),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(3),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [JobMarketplaceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<JobMarketplaceService>(JobMarketplaceService);
  });

  describe('createJob', () => {
    it('should create a job posting', async () => {
      const result = await service.createJob({
        employerId: 'u1', categoryId: 1, title: 'Developer', description: 'Build stuff', salary: '1000',
      });
      expect(result.id).toBe('job-1');
    });
  });

  describe('getJob', () => {
    it('should throw NotFoundException for missing job', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.getJob('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return job with relations', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', title: 'Dev' });
      const result = await service.getJob('job-1');
      expect(result.title).toBe('Dev');
    });
  });

  describe('getAllJobs', () => {
    it('should return filtered jobs', async () => {
      await service.getAllJobs({ remote: true });
      expect(prisma.job.findMany).toHaveBeenCalled();
    });
  });

  describe('closeJob', () => {
    it('should throw NotFoundException for missing job', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.closeJob('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-employer', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', employerId: 'u2' });
      await expect(service.closeJob('job-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should close job', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', employerId: 'u1', status: 'OPEN' });
      prisma.job.update.mockResolvedValue({ id: 'job-1', status: 'CLOSED' });
      const result = await service.closeJob('job-1', 'u1');
      expect(result.status).toBe('CLOSED');
    });
  });

  describe('applyForJob', () => {
    it('should throw NotFoundException for missing job', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.applyForJob({
        jobId: 'bad', applicantId: 'u1', coverLetter: 'Hi',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for closed job', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', status: 'CLOSED' });
      await expect(service.applyForJob({
        jobId: 'job-1', applicantId: 'u1', coverLetter: 'Hi',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate application', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', status: 'OPEN' });
      prisma.jobApplication.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.applyForJob({
        jobId: 'job-1', applicantId: 'u1', coverLetter: 'Hi',
      })).rejects.toThrow(BadRequestException);
    });

    it('should create application', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', status: 'OPEN' });
      prisma.jobApplication.findUnique.mockResolvedValue(null);
      const result = await service.applyForJob({
        jobId: 'job-1', applicantId: 'u1', coverLetter: 'Hi',
      });
      expect(result.id).toBe('app-1');
    });
  });

  describe('withdrawApplication', () => {
    it('should throw NotFoundException for missing application', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue(null);
      await expect(service.withdrawApplication('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-applicant', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue({ id: 'app-1', applicantId: 'u2' });
      await expect(service.withdrawApplication('app-1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeJob', () => {
    it('should throw NotFoundException for missing job', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.completeJob('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not IN_PROGRESS', async () => {
      prisma.job.findUnique.mockResolvedValue({ id: 'job-1', employerId: 'u1', status: 'OPEN' });
      await expect(service.completeJob('job-1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return marketplace statistics', async () => {
      const result = await service.getStats();
      expect(result).toEqual({
        totalJobs: 5,
        openJobs: 5,
        totalApplications: 3,
        acceptedApplications: 3,
      });
    });
  });
});
