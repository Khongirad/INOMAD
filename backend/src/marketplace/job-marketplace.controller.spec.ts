import { Test, TestingModule } from '@nestjs/testing';
import { JobMarketplaceController } from './job-marketplace.controller';
import { JobMarketplaceService } from './job-marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('JobMarketplaceController', () => {
  let controller: JobMarketplaceController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createJob: jest.fn().mockResolvedValue({ id: 'j1', title: 'Dev' }),
      getAllJobs: jest.fn().mockResolvedValue([{ id: 'j1' }]),
      getJob: jest.fn().mockResolvedValue({ id: 'j1' }),
      getMyJobs: jest.fn().mockResolvedValue([]),
      closeJob: jest.fn().mockResolvedValue({ id: 'j1', status: 'CLOSED' }),
      applyForJob: jest.fn().mockResolvedValue({ id: 'a1' }),
      getApplications: jest.fn().mockResolvedValue([]),
      acceptApplication: jest.fn().mockResolvedValue({ id: 'a1', status: 'ACCEPTED' }),
      withdrawApplication: jest.fn().mockResolvedValue({ id: 'a1' }),
      getMyApplications: jest.fn().mockResolvedValue([]),
      completeJob: jest.fn().mockResolvedValue({ id: 'j1', status: 'COMPLETED' }),
      getStats: jest.fn().mockResolvedValue({ totalJobs: 10, totalApplications: 50 }),
      searchJobs: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobMarketplaceController],
      providers: [{ provide: JobMarketplaceService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(JobMarketplaceController);
    service = module.get(JobMarketplaceService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates job', async () => {
    const r = await controller.createJob(req, {
      categoryId: '1', title: 'Dev', description: 'Build stuff',
      requirements: [], salary: 1000, duration: 30,
      location: 'Remote', remote: true,
    });
    expect(r.success).toBe(true);
  });

  it('creates job with dates', async () => {
    const r = await controller.createJob(req, {
      categoryId: '1', title: 'Dev', description: 'x',
      deadline: '2025-06-01', startDate: '2025-07-01',
    });
    expect(r.success).toBe(true);
  });

  it('gets all jobs with filters', async () => {
    const r = await controller.getAllJobs('1', 'OPEN', 'u1', 'true', 'dev');
    expect(r.success).toBe(true);
    expect(service.getAllJobs).toHaveBeenCalledWith({
      categoryId: 1, status: 'OPEN', employerId: 'u1', remote: true, search: 'dev',
    });
  });

  it('gets all jobs without filters', async () => {
    const r = await controller.getAllJobs();
    expect(service.getAllJobs).toHaveBeenCalledWith({});
  });

  it('gets single job', async () => {
    const r = await controller.getJob('j1');
    expect(r.data.id).toBe('j1');
  });

  it('gets my jobs', async () => {
    const r = await controller.getMyJobs(req);
    expect(r.success).toBe(true);
  });

  it('closes job', async () => {
    const r = await controller.closeJob(req, 'j1');
    expect(r.success).toBe(true);
  });

  it('applies for job', async () => {
    const r = await controller.applyForJob(req, 'j1', {
      coverLetter: 'I am great', resumeUrl: 'http://resume.com', expectedSalary: 1200,
    });
    expect(r.success).toBe(true);
    expect(r.message).toContain('submitted');
  });

  it('gets applications', async () => {
    const r = await controller.getApplications(req, 'j1');
    expect(r.success).toBe(true);
  });

  it('accepts application', async () => {
    const r = await controller.acceptApplication(req, 'a1', { notes: 'welcome' });
    expect(r.success).toBe(true);
    expect(r.message).toContain('accepted');
  });

  it('rejects application', async () => {
    const r = await controller.rejectApplication(req, 'a1', { notes: 'sorry' });
    expect(r.success).toBe(true);
    expect(r.message).toContain('rejected');
  });

  it('withdraws application', async () => {
    const r = await controller.withdrawApplication(req, 'a1');
    expect(r.success).toBe(true);
  });

  it('gets my applications', async () => {
    const r = await controller.getMyApplications(req);
    expect(r.success).toBe(true);
  });

  it('completes job', async () => {
    const r = await controller.completeJob(req, 'j1');
    expect(r.success).toBe(true);
  });

  it('gets stats', async () => {
    const r = await controller.getStats();
    expect(r.success).toBe(true);
  });

  it('searches jobs', async () => {
    const r = await controller.search('developer');
    expect(r.success).toBe(true);
    expect(service.searchJobs).toHaveBeenCalledWith('developer');
  });
});
