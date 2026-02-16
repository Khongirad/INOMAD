import { Test, TestingModule } from '@nestjs/testing';
import { JobMarketplaceService } from './job-marketplace.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JobMarketplaceService', () => {
  let service: JobMarketplaceService;
  let prisma: any;

  const mockJob = {
    id: 'j1', employerId: 'e1', categoryId: 1, title: 'Dev',
    description: 'Build', requirements: 'JS', salary: '500',
    duration: '3mo', location: 'Remote', remote: true,
    deadline: null, startDate: null, status: 'OPEN',
    closedAt: null, createdAt: new Date(),
    applications: [], _count: { applications: 2 },
  };

  const mockApp = {
    id: 'a1', jobId: 'j1', applicantId: 'ap1', coverLetter: 'Hi',
    resumeUrl: null, expectedSalary: '400', status: 'PENDING',
    respondedAt: null, employerNotes: null, appliedAt: new Date(),
    job: mockJob,
  };

  beforeEach(async () => {
    const mockPrisma = {
      job: {
        create: jest.fn().mockResolvedValue(mockJob),
        findUnique: jest.fn().mockResolvedValue(mockJob),
        findMany: jest.fn().mockResolvedValue([mockJob]),
        update: jest.fn().mockResolvedValue({ ...mockJob, status: 'CLOSED' }),
        count: jest.fn().mockResolvedValue(10),
      },
      jobApplication: {
        create: jest.fn().mockResolvedValue(mockApp),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockApp]),
        update: jest.fn().mockResolvedValue({ ...mockApp, status: 'ACCEPTED' }),
        count: jest.fn().mockResolvedValue(5),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobMarketplaceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(JobMarketplaceService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createJob', () => {
    it('creates job listing', async () => {
      const r = await service.createJob({
        employerId: 'e1', categoryId: 1, title: 'Dev',
        description: 'Build', salary: '500',
      });
      expect(r.id).toBe('j1');
    });
    it('creates with optional fields', async () => {
      await service.createJob({
        employerId: 'e1', categoryId: 1, title: 'Dev',
        description: 'Build', salary: '500', requirements: 'TS',
        duration: '6mo', location: 'NYC', remote: true,
        deadline: new Date(), startDate: new Date(),
      });
      expect(prisma.job.create).toHaveBeenCalled();
    });
  });

  describe('getJob', () => {
    it('returns job', async () => {
      const r = await service.getJob('j1');
      expect(r.id).toBe('j1');
    });
    it('throws when not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.getJob('bad')).rejects.toThrow('not found');
    });
  });

  describe('getAllJobs', () => {
    it('returns all jobs', async () => {
      const r = await service.getAllJobs();
      expect(r).toHaveLength(1);
    });
    it('applies category filter', async () => {
      await service.getAllJobs({ categoryId: 1 });
      expect(prisma.job.findMany).toHaveBeenCalled();
    });
    it('applies status filter', async () => {
      await service.getAllJobs({ status: 'OPEN' as any });
      expect(prisma.job.findMany).toHaveBeenCalled();
    });
    it('applies employer filter', async () => {
      await service.getAllJobs({ employerId: 'e1' });
      expect(prisma.job.findMany).toHaveBeenCalled();
    });
    it('applies remote filter', async () => {
      await service.getAllJobs({ remote: true });
      expect(prisma.job.findMany).toHaveBeenCalled();
    });
    it('applies search filter', async () => {
      await service.getAllJobs({ search: 'dev' });
      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'dev', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getMyJobs', () => {
    it('returns employer jobs', async () => {
      const r = await service.getMyJobs('e1');
      expect(r).toHaveLength(1);
    });
  });

  describe('closeJob', () => {
    it('closes job', async () => {
      await service.closeJob('j1', 'e1');
      expect(prisma.job.update).toHaveBeenCalled();
    });
    it('throws when not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.closeJob('bad', 'e1')).rejects.toThrow('not found');
    });
    it('throws when not employer', async () => {
      await expect(service.closeJob('j1', 'other')).rejects.toThrow('Not authorized');
    });
  });

  describe('applyForJob', () => {
    it('applies for job', async () => {
      const r = await service.applyForJob({
        jobId: 'j1', applicantId: 'ap1', coverLetter: 'Hi',
      });
      expect(r.id).toBe('a1');
    });
    it('throws when job not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.applyForJob({
        jobId: 'bad', applicantId: 'ap1', coverLetter: 'Hi',
      })).rejects.toThrow('not found');
    });
    it('throws when job not open', async () => {
      prisma.job.findUnique.mockResolvedValue({ ...mockJob, status: 'CLOSED' });
      await expect(service.applyForJob({
        jobId: 'j1', applicantId: 'ap1', coverLetter: 'Hi',
      })).rejects.toThrow('not open');
    });
    it('throws when already applied', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue(mockApp);
      await expect(service.applyForJob({
        jobId: 'j1', applicantId: 'ap1', coverLetter: 'Hi',
      })).rejects.toThrow('Already applied');
    });
  });

  describe('getApplications', () => {
    it('returns applications for employer', async () => {
      const r = await service.getApplications('j1', 'e1');
      expect(r).toHaveLength(1);
    });
    it('throws when job not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.getApplications('bad', 'e1')).rejects.toThrow('not found');
    });
    it('throws when not employer', async () => {
      await expect(service.getApplications('j1', 'other')).rejects.toThrow('Not authorized');
    });
  });

  describe('acceptApplication', () => {
    it('accepts application', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue({
        ...mockApp, job: { employerId: 'e1' },
      });
      const r = await service.acceptApplication({
        applicationId: 'a1', employerId: 'e1', accept: true,
      });
      expect(prisma.job.update).toHaveBeenCalled();
    });
    it('rejects application', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue({
        ...mockApp, job: { employerId: 'e1' },
      });
      await service.acceptApplication({
        applicationId: 'a1', employerId: 'e1', accept: false, notes: 'No fit',
      });
      expect(prisma.jobApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue(null);
      await expect(service.acceptApplication({
        applicationId: 'bad', employerId: 'e1', accept: true,
      })).rejects.toThrow('not found');
    });
    it('throws when not employer', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue({
        ...mockApp, job: { employerId: 'other' },
      });
      await expect(service.acceptApplication({
        applicationId: 'a1', employerId: 'e1', accept: true,
      })).rejects.toThrow('Not authorized');
    });
  });

  describe('withdrawApplication', () => {
    it('withdraws pending application', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue(mockApp);
      await service.withdrawApplication('a1', 'ap1');
      expect(prisma.jobApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'WITHDRAWN' },
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue(null);
      await expect(service.withdrawApplication('bad', 'ap1')).rejects.toThrow('not found');
    });
    it('throws when not applicant', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue(mockApp);
      await expect(service.withdrawApplication('a1', 'other')).rejects.toThrow('Not authorized');
    });
    it('throws when not pending', async () => {
      prisma.jobApplication.findUnique.mockResolvedValue({
        ...mockApp, applicantId: 'ap1', status: 'ACCEPTED',
      });
      await expect(service.withdrawApplication('a1', 'ap1')).rejects.toThrow('pending');
    });
  });

  describe('getMyApplications', () => {
    it('returns applicant applications', async () => {
      const r = await service.getMyApplications('ap1');
      expect(r).toHaveLength(1);
    });
  });

  describe('completeJob', () => {
    it('completes in-progress job', async () => {
      prisma.job.findUnique.mockResolvedValue({ ...mockJob, status: 'IN_PROGRESS' });
      await service.completeJob('j1', 'e1');
      expect(prisma.job.update).toHaveBeenCalled();
    });
    it('throws when not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null);
      await expect(service.completeJob('bad', 'e1')).rejects.toThrow('not found');
    });
    it('throws when not employer', async () => {
      await expect(service.completeJob('j1', 'other')).rejects.toThrow('Not authorized');
    });
    it('throws when not in progress', async () => {
      await expect(service.completeJob('j1', 'e1')).rejects.toThrow('not in progress');
    });
  });

  describe('getStats', () => {
    it('returns stats', async () => {
      const r = await service.getStats();
      expect(r.totalJobs).toBe(10);
      expect(r.openJobs).toBe(10);
      expect(r.totalApplications).toBe(5);
      expect(r.acceptedApplications).toBe(5);
    });
  });

  describe('searchJobs', () => {
    it('searches jobs', async () => {
      const r = await service.searchJobs('dev');
      expect(r).toHaveLength(1);
    });
  });
});
