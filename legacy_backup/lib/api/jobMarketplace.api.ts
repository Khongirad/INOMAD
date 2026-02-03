/**
 * Job Marketplace API Client
 * 
 * Complete API client for job marketplace operations including:
 * - Job posting management
 * - Application management
 * - Application status workflow
 * - Job completion
 * - Statistics
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// Types
// ============================================================================

export type JobPostingStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
export type JobApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface Job {
  id: string;
  employerId: string;
  categoryId: number;
  title: string;
  description: string;
  requirements?: string;
  salary: string;
  duration?: string;
  location?: string;
  remote: boolean;
  status: JobPostingStatus;
  deadline?: string;
  createdAt: string;
  closedAt?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string;
  resumeUrl?: string;
  expectedSalary?: string;
  status: JobApplicationStatus;
  notes?: string;
  appliedAt: string;
  respondedAt?: string;
  job?: Job;
}

export interface JobStats {
  totalJobs: number;
  openJobs: number;
  totalApplications: number;
  acceptedApplications: number;
}

// Request DTOs
export interface CreateJobDto {
  categoryId: number;
  title: string;
  description: string;
  requirements?: string;
  salary: string;
  duration?: string;
  location?: string;
  remote?: boolean;
  deadline?: string;
}

export interface ApplyForJobDto {
  coverLetter: string;
  resumeUrl?: string;
  expectedSalary?: string;
}

export interface RespondToApplicationDto {
  notes?: string;
}

export interface JobFilters {
  categoryId?: number;
  status?: JobPostingStatus;
  employerId?: string;
  remote?: boolean;
  search?: string;
}

// ============================================================================
// API Client
// ============================================================================

class JobMarketplaceApi {
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Job Management

  async createJob(data: CreateJobDto): Promise<Job  > {
    const response = await axios.post(
      `${API_BASE_URL}/jobs`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getAllJobs(filters?: JobFilters): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/jobs?${params.toString()}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getJob(id: string): Promise<Job> {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/${id}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getJobsByEmployer(employerId: string): Promise<{
    open: number;
    inProgress: number;
    completed: number;
    jobs: Job[];
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/employers/${employerId}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async closeJob(id: string): Promise<Job> {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/${id}/close`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async completeJob(id: string): Promise<Job> {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/${id}/complete`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Application Management

  async applyForJob(jobId: string, data: ApplyForJobDto): Promise<JobApplication> {
    const response = await axios.post(
      `${API_BASE_URL}/jobs/${jobId}/apply`,
      data,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getJobApplications(jobId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    applications: JobApplication[];
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/${jobId}/applications`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async getMyApplications(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    applications: JobApplication[];
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/applications/my`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async acceptApplication(applicationId: string, data?: RespondToApplicationDto): Promise<JobApplication> {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/applications/${applicationId}/accept`,
      data || {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async rejectApplication(applicationId: string, data?: RespondToApplicationDto): Promise<JobApplication> {
    const response = await axios.put(
      `${API_BASE_URL}/jobs/applications/${applicationId}/reject`,
      data || {},
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async withdrawApplication(applicationId: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/jobs/applications/${applicationId}/withdraw`,
      { headers: this.getHeaders() }
    );
  }

  // Statistics

  async getJobStats(): Promise<JobStats> {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/stats`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  // Search

  async searchJobs(query: string): Promise<{
    results: Job[];
    total: number;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/jobs/search?q=${encodeURIComponent(query)}`,
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const jobMarketplaceApi = new JobMarketplaceApi();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format salary for display
 */
export function formatSalary(salary: string): string {
  const num = parseFloat(salary);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Check if user can manage job (is employer)
 */
export function canManageJob(job: Job, userId: string): boolean {
  return job.employerId === userId;
}

/**
 * Check if user can apply for job
 */
export function canApplyForJob(job: Job, userId: string): boolean {
  return job.status === 'OPEN' && job.employerId !== userId;
}

/**
 * Check if job is still open
 */
export function isJobOpen(job: Job): boolean {
  if (job.status !== 'OPEN') return false;
  if (!job.deadline) return true;
  return new Date(job.deadline) > new Date();
}

/**
 * Get job status badge color
 */
export function getJobStatusColor(status: JobPostingStatus): string {
  const colors: Record<JobPostingStatus, string> = {
    OPEN: 'success',
    IN_PROGRESS: 'info',
    COMPLETED: 'default',
    CANCELLED: 'error',
    CLOSED: 'default',
  };
  return colors[status] || 'default';
}

/**
 * Get application status badge color
 */
export function getApplicationStatusColor(status: JobApplicationStatus): string {
  const colors: Record<JobApplicationStatus, string> = {
    PENDING: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'error',
    WITHDRAWN: 'default',
  };
  return colors[status] || 'default';
}

/**
 * Calculate days until deadline
 */
export function getDaysUntilDeadline(deadline: string | undefined): number | null {
  if (!deadline) return null;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format deadline display
 */
export function formatDeadline(deadline: string | undefined): string {
  if (!deadline) return 'No deadline';
  const days = getDaysUntilDeadline(deadline);
  if (days === null) return 'No deadline';
  if (days < 0) return 'Expired';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days left`;
}
