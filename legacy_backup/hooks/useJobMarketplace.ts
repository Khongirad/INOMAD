/**
 * useJobMarketplace Hook
 * 
 * Custom React hook for job marketplace state management including:
 * - Job posting management (CRUD operations)
 * - Application management
 * - Application workflow (accept/reject)
 * - Job completion
 * - Error handling
 */

import { useState, useCallback } from 'react';
import {
  jobMarketplaceApi,
  Job,
  JobApplication,
  JobStats,
  CreateJobDto,
  ApplyForJobDto,
  RespondToApplicationDto,
  JobFilters,
} from '../lib/api/jobMarketplace.api';

interface UseJobMarketplaceState {
  // Data
  jobs: Job[];
  currentJob: Job | null;
  myJobs: Job[];
  myApplications: JobApplication[];
  jobApplications: JobApplication[];
  stats: JobStats | null;
  
  // UI State
  loading: boolean;
  error: string | null;
}

interface UseJobMarketplaceReturn extends UseJobMarketplaceState {
  // Job Management
  createJob: (data: CreateJobDto) => Promise<Job | null>;
  getAllJobs: (filters?: JobFilters) => Promise<void>;
  getJob: (id: string) => Promise<void>;
  getJobsByEmployer: (employerId: string) => Promise<void>;
  closeJob: (id: string) => Promise<boolean>;
  completeJob: (id: string) => Promise<boolean>;
  
  // Application Management
  applyForJob: (jobId: string, data: ApplyForJobDto) => Promise<JobApplication | null>;
  getJobApplications: (jobId: string) => Promise<void>;
  fetchMyApplications: () => Promise<void>;
  acceptApplication: (applicationId: string, notes?: string) => Promise<boolean>;
  rejectApplication: (applicationId: string, notes?: string) => Promise<boolean>;
  withdrawApplication: (applicationId: string) => Promise<boolean>;
  
  // Statistics
  fetchStats: () => Promise<void>;
  
  // Search
  searchJobs: (query: string) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

export function useJobMarketplace(): UseJobMarketplaceReturn {
  const [state, setState] = useState<UseJobMarketplaceState>({
    jobs: [],
    currentJob: null,
    myJobs: [],
    myApplications: [],
    jobApplications: [],
    stats: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Job Management

  const createJob = useCallback(async (data: CreateJobDto): Promise<Job | null> => {
    try {
      setLoading(true);
      setError(null);
      const job = await jobMarketplaceApi.createJob(data);
      setState((prev) => ({
        ...prev,
        myJobs: [...prev.myJobs, job],
        loading: false,
      }));
      return job;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create job');
      setLoading(false);
      return null;
    }
  }, []);

  const getAllJobs = useCallback(async (filters?: JobFilters): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const jobs = await jobMarketplaceApi.getAllJobs(filters);
      setState((prev) => ({ ...prev, jobs, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch jobs');
      setLoading(false);
    }
  }, []);

  const getJob = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const job = await jobMarketplaceApi.getJob(id);
      setState((prev) => ({ ...prev, currentJob: job, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch job');
      setLoading(false);
    }
  }, []);

  const getJobsByEmployer = useCallback(async (employerId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobMarketplaceApi.getJobsByEmployer(employerId);
      setState((prev) => ({ ...prev, myJobs: data.jobs, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch employer jobs');
      setLoading(false);
    }
  }, []);

  const closeJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const job = await jobMarketplaceApi.closeJob(id);
      setState((prev) => ({
        ...prev,
        myJobs: prev.myJobs.map((j) => (j.id === id ? job : j)),
        currentJob: prev.currentJob?.id === id ? job : prev.currentJob,
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close job');
      setLoading(false);
      return false;
    }
  }, []);

  const completeJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const job = await jobMarketplaceApi.completeJob(id);
      setState((prev) => ({
        ...prev,
        myJobs: prev.myJobs.map((j) => (j.id === id ? job : j)),
        currentJob: prev.currentJob?.id === id ? job : prev.currentJob,
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete job');
      setLoading(false);
      return false;
    }
  }, []);

  // Application Management

  const applyForJob = useCallback(async (jobId: string, data: ApplyForJobDto): Promise<JobApplication | null> => {
    try {
      setLoading(true);
      setError(null);
      const application = await jobMarketplaceApi.applyForJob(jobId, data);
      setState((prev) => ({
        ...prev,
        myApplications: [...prev.myApplications, application],
        loading: false,
      }));
      return application;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply for job');
      setLoading(false);
      return null;
    }
  }, []);

  const getJobApplications = useCallback(async (jobId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobMarketplaceApi.getJobApplications(jobId);
      setState((prev) => ({ ...prev, jobApplications: data.applications, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch applications');
      setLoading(false);
    }
  }, []);

  const fetchMyApplications = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobMarketplaceApi.getMyApplications();
      setState((prev) => ({ ...prev, myApplications: data.applications, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch my applications');
      setLoading(false);
    }
  }, []);

  const acceptApplication = useCallback(async (applicationId: string, notes?: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const data: RespondToApplicationDto = notes ? { notes } : {};
      const application = await jobMarketplaceApi.acceptApplication(applicationId, data);
      setState((prev) => ({
        ...prev,
        jobApplications: prev.jobApplications.map((app) =>
          app.id === applicationId ? application : app
        ),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept application');
      setLoading(false);
      return false;
    }
  }, []);

  const rejectApplication = useCallback(async (applicationId: string, notes?: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const data: RespondToApplicationDto = notes ? { notes } : {};
      const application = await jobMarketplaceApi.rejectApplication(applicationId, data);
      setState((prev) => ({
        ...prev,
        jobApplications: prev.jobApplications.map((app) =>
          app.id === applicationId ? application : app
        ),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject application');
      setLoading(false);
      return false;
    }
  }, []);

  const withdrawApplication = useCallback(async (applicationId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await jobMarketplaceApi.withdrawApplication(applicationId);
      setState((prev) => ({
        ...prev,
        myApplications: prev.myApplications.filter((app) => app.id !== applicationId),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to withdraw application');
      setLoading(false);
      return false;
    }
  }, []);

  // Statistics

  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const stats = await jobMarketplaceApi.getJobStats();
      setState((prev) => ({ ...prev, stats, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
      setLoading(false);
    }
  }, []);

  // Search

  const searchJobs = useCallback(async (query: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobMarketplaceApi.searchJobs(query);
      setState((prev) => ({ ...prev, jobs: data.results, loading: false }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search jobs');
      setLoading(false);
    }
  }, []);

  return {
    ...state,
    createJob,
    getAllJobs,
    getJob,
    getJobsByEmployer,
    closeJob,
    completeJob,
    applyForJob,
    getJobApplications,
    fetchMyApplications,
    acceptApplication,
    rejectApplication,
    withdrawApplication,
    fetchStats,
    searchJobs,
    clearError,
  };
}
