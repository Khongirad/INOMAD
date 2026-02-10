import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobPostingStatus, JobApplicationStatus } from '@prisma/client';

export interface CreateJobDto {
  employerId: string;
  categoryId: number;
  title: string;
  description: string;
  requirements?: string;
  salary: string;
  duration?: string;
  location?: string;
  remote?: boolean;
  deadline?: Date;
  startDate?: Date;
}

export interface ApplyForJobDto {
  jobId: string;
  applicantId: string;
  coverLetter: string;
  resumeUrl?: string;
  expectedSalary?: string;
}

export interface RespondToApplicationDto {
  applicationId: string;
  employerId: string;
  accept: boolean;
  notes?: string;
}

/**
 * @service JobMarketplaceService
 * @description Service for job postings and applications
 */
@Injectable()
export class JobMarketplaceService {
  private readonly logger = new Logger(JobMarketplaceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create job posting
   */
  async createJob(data: CreateJobDto) {
    this.logger.log(`Creating job: ${data.title}`);

    return this.prisma.job.create({
      data: {
        employerId: data.employerId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        salary: data.salary,
        duration: data.duration,
        location: data.location,
        remote: data.remote || false,
        deadline: data.deadline,
        startDate: data.startDate,
        status: JobPostingStatus.OPEN,
      },
    });
  }

  /**
   * Get job by ID
   */
  async getJob(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        applications: {
          orderBy: { appliedAt: 'desc' },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return job;
  }

  /**
   * Get all jobs with filters
   */
  async getAllJobs(filters?: {
    categoryId?: number;
    status?: JobPostingStatus;
    employerId?: string;
    remote?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters) {
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.status) where.status = filters.status;
      if (filters.employerId) where.employerId = filters.employerId;
      if (filters.remote !== undefined) where.remote = filters.remote;
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    return this.prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  /**
   * Get jobs posted by employer
   */
  async getMyJobs(employerId: string) {
    return this.getAllJobs({ employerId });
  }

  /**
   * Close job posting
   */
  async closeJob(id: string, employerId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    if (job.employerId !== employerId) {
      throw new BadRequestException('Not authorized');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        status: JobPostingStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }

  /**
   * Apply for job
   */
  async applyForJob(data: ApplyForJobDto) {
    this.logger.log(`Application: job ${data.jobId} by ${data.applicantId}`);

    const job = await this.prisma.job.findUnique({
      where: { id: data.jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job ${data.jobId} not found`);
    }

    if (job.status !== JobPostingStatus.OPEN) {
      throw new BadRequestException('Job not open for applications');
    }

    // Check if already applied
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_applicantId: {
          jobId: data.jobId,
          applicantId: data.applicantId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already applied to this job');
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        applicantId: data.applicantId,
        coverLetter: data.coverLetter,
        resumeUrl: data.resumeUrl,
        expectedSalary: data.expectedSalary,
        status: JobApplicationStatus.PENDING,
      },
    });
  }

  /**
   * Get applications for a job
   */
  async getApplications(jobId: string, employerId: string) {
    // Verify employer owns this job
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    if (job.employerId !== employerId) {
      throw new BadRequestException('Not authorized');
    }

    return this.prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { appliedAt: 'desc' },
    });
  }

  /**
   * Accept application
   */
  async acceptApplication(data: RespondToApplicationDto) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: data.applicationId },
      include: { job: true },
    });

    if (!application) {
      throw new NotFoundException(`Application ${data.applicationId} not found`);
    }

    if (application.job.employerId !== data.employerId) {
      throw new BadRequestException('Not authorized');
    }

    if (data.accept) {
      // Accept application
      const updated = await this.prisma.jobApplication.update({
        where: { id: data.applicationId },
        data: {
          status: JobApplicationStatus.ACCEPTED,
          respondedAt: new Date(),
          employerNotes: data.notes,
        },
      });

      // Update job status to IN_PROGRESS
      await this.prisma.job.update({
        where: { id: application.jobId },
        data: { status: JobPostingStatus.IN_PROGRESS },
      });

      return updated;
    } else {
      // Reject application
      return this.prisma.jobApplication.update({
        where: { id: data.applicationId },
        data: {
          status: JobApplicationStatus.REJECTED,
          respondedAt: new Date(),
          employerNotes: data.notes,
        },
      });
    }
  }

  /**
   * Withdraw application (applicant)
   */
  async withdrawApplication(applicationId: string, applicantId: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (application.applicantId !== applicantId) {
      throw new BadRequestException('Not authorized');
    }

    if (application.status !== JobApplicationStatus.PENDING) {
      throw new BadRequestException('Can only withdraw pending applications');
    }

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: JobApplicationStatus.WITHDRAWN },
    });
  }

  /**
   * Get applicant's applications
   */
  async getMyApplications(applicantId: string) {
    return this.prisma.jobApplication.findMany({
      where: { applicantId },
      include: { job: true },
      orderBy: { appliedAt: 'desc' },
    });
  }

  /**
   * Complete job
   */
  async completeJob(jobId: string, employerId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    if (job.employerId !== employerId) {
      throw new BadRequestException('Not authorized');
    }

    if (job.status !== JobPostingStatus.IN_PROGRESS) {
      throw new BadRequestException('Job not in progress');
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobPostingStatus.COMPLETED,
        closedAt: new Date(),
      },
    });
  }

  /**
   * Get job marketplace statistics
   */
  async getStats() {
    const [
      totalJobs,
      openJobs,
      totalApplications,
      acceptedApplications,
    ] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobPostingStatus.OPEN } }),
      this.prisma.jobApplication.count(),
      this.prisma.jobApplication.count({ where: { status: JobApplicationStatus.ACCEPTED } }),
    ]);

    return {
      totalJobs,
      openJobs,
      totalApplications,
      acceptedApplications,
    };
  }

  /**
   * Search jobs
   */
  async searchJobs(query: string) {
    return this.getAllJobs({ search: query });
  }
}
