import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JobMarketplaceService } from './job-marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobPostingStatus } from '@prisma/client';

/**
 * @controller JobMarketplaceController
 * @description REST API for job marketplace
 * 
 * Endpoints:
 * - POST /jobs - Create job posting
 * - GET /jobs - Get all jobs (with filters)
 * - GET /jobs/:id - Get single job
 * - DELETE /jobs/:id - Close job
 * - POST /jobs/:id/apply - Apply for job
 * - GET /jobs/:id/applications - Get applications (employer)
 * - PUT /jobs/applications/:id/accept - Accept application
 * - PUT /jobs/applications/:id/reject - Reject application
 * - DELETE /jobs/applications/:id - Withdraw application
 * - POST /jobs/:id/complete - Complete job
 */
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobMarketplaceController {
  constructor(
    private readonly jobMarketplaceService: JobMarketplaceService,
  ) {}

  /**
   * Create job posting
   */
  @Post()
  async createJob(@Request() req, @Body() body: any) {
    const {
      categoryId,
      title,
      description,
      requirements,
      salary,
      duration,
      location,
      remote,
      deadline,
      startDate,
    } = body;

    const job = await this.jobMarketplaceService.createJob({
      employerId: req.user.userId,
      categoryId: parseInt(categoryId),
      title,
      description,
      requirements,
      salary,
      duration,
      location,
      remote: remote === true || remote === 'true',
      deadline: deadline ? new Date(deadline) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
    });

    return {
      success: true,
      data: job,
    };
  }

  /**
   * Get all jobs with filters
   */
  @Get()
  async getAllJobs(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('employerId') employerId?: string,
    @Query('remote') remote?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (categoryId) filters.categoryId = parseInt(categoryId);
    if (status) filters.status = status as JobPostingStatus;
    if (employerId) filters.employerId = employerId;
    if (remote !== undefined) filters.remote = remote === 'true';
    if (search) filters.search = search;

    const jobs = await this.jobMarketplaceService.getAllJobs(filters);

    return {
      success: true,
      data: jobs,
    };
  }

  /**
   * Get single job
   */
  @Get(':id')
  async getJob(@Param('id') id: string) {
    const job = await this.jobMarketplaceService.getJob(id);

    return {
      success: true,
      data: job,
    };
  }

  /**
   * Get my job postings
   */
  @Get('my/postings')
  async getMyJobs(@Request() req) {
    const jobs = await this.jobMarketplaceService.getMyJobs(req.user.userId);

    return {
      success: true,
      data: jobs,
    };
  }

  /**
   * Close job posting
   */
  @Delete(':id')
  async closeJob(@Request() req, @Param('id') id: string) {
    const closed = await this.jobMarketplaceService.closeJob(
      id,
      req.user.userId,
    );

    return {
      success: true,
      data: closed,
    };
  }

  /**
   * Apply for job
   */
  @Post(':id/apply')
  async applyForJob(
    @Request() req,
    @Param('id') jobId: string,
    @Body() body: any,
  ) {
    const { coverLetter, resumeUrl, expectedSalary } = body;

    const application = await this.jobMarketplaceService.applyForJob({
      jobId,
      applicantId: req.user.userId,
      coverLetter,
      resumeUrl,
      expectedSalary,
    });

    return {
      success: true,
      data: application,
      message: 'Application submitted successfully',
    };
  }

  /**
   * Get applications for job (employer only)
   */
  @Get(':id/applications')
  async getApplications(@Request() req, @Param('id') jobId: string) {
    const applications = await this.jobMarketplaceService.getApplications(
      jobId,
      req.user.userId,
    );

    return {
      success: true,
      data: applications,
    };
  }

  /**
   * Accept application
   */
  @Put('applications/:id/accept')
  async acceptApplication(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() body: any,
  ) {
    const { notes } = body;

    const accepted = await this.jobMarketplaceService.acceptApplication({
      applicationId,
      employerId: req.user.userId,
      accept: true,
      notes,
    });

    return {
      success: true,
      data: accepted,
      message: 'Application accepted',
    };
  }

  /**
   * Reject application
   */
  @Put('applications/:id/reject')
  async rejectApplication(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() body: any,
  ) {
    const { notes } = body;

    const rejected = await this.jobMarketplaceService.acceptApplication({
      applicationId,
      employerId: req.user.userId,
      accept: false,
      notes,
    });

    return {
      success: true,
      data: rejected,
      message: 'Application rejected',
    };
  }

  /**
   * Withdraw application (applicant)
   */
  @Delete('applications/:id')
  async withdrawApplication(
    @Request() req,
    @Param('id') applicationId: string,
  ) {
    const withdrawn = await this.jobMarketplaceService.withdrawApplication(
      applicationId,
      req.user.userId,
    );

    return {
      success: true,
      data: withdrawn,
      message: 'Application withdrawn',
    };
  }

  /**
   * Get my applications
   */
  @Get('my/applications')
  async getMyApplications(@Request() req) {
    const applications = await this.jobMarketplaceService.getMyApplications(
      req.user.userId,
    );

    return {
      success: true,
      data: applications,
    };
  }

  /**
   * Complete job
   */
  @Post(':id/complete')
  async completeJob(@Request() req, @Param('id') jobId: string) {
    const completed = await this.jobMarketplaceService.completeJob(
      jobId,
      req.user.userId,
    );

    return {
      success: true,
      data: completed,
      message: 'Job completed',
    };
  }

  /**
   * Get job marketplace statistics
   */
  @Get('stats/overview')
  async getStats() {
    const stats = await this.jobMarketplaceService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Search jobs
   */
  @Get('search/query')
  async search(@Query('q') query: string) {
    const results = await this.jobMarketplaceService.searchJobs(query);

    return {
      success: true,
      data: results,
    };
  }
}
