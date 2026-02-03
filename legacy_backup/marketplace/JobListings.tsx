/**
 * JobListings Component
 * 
 * Browse all job postings with:
 * - Search functionality
 * - Category filters
 * - Status filters
 * - Remote/on-site toggle
 * - Application tracking
 * - Responsive design
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Container,
  InputAdornment,
  Skeleton,
  Stack,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  AttachMoney as SalaryIcon,
  Schedule as DeadlineIcon,
  RemoteWork as RemoteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJobMarketplace } from '../../hooks/useJobMarketplace';
import {
  Job,
  JobPostingStatus,
  formatSalary,
  formatDeadline,
  isJobOpen,
  getJobStatusColor,
} from '../../lib/api/jobMarketplace.api';

export const JobListings: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, loading, error, getAllJobs, searchJobs, clearError } = useJobMarketplace();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<JobPostingStatus | 'ALL'>('OPEN');
  const [remoteFilter, setRemoteFilter] = useState<'ALL' | 'REMOTE' | 'ONSITE'>('ALL');

  useEffect(() => {
    loadJobs();
  }, [selectedStatus, remoteFilter]);

  const loadJobs = () => {
    const filters: any = {};
    if (selectedStatus !== 'ALL') filters.status = selectedStatus;
    if (remoteFilter === 'REMOTE') filters.remote = true;
    if (remoteFilter === 'ONSITE') filters.remote = false;
    
    getAllJobs(filters);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchJobs(searchQuery);
    } else {
      loadJobs();
    }
  };

  const handleViewJob = (id: string) => {
    navigate(`/jobs/${id}`);
  };

  const handlePostJob = () => {
    navigate('/jobs/create');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Job Board
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Find opportunities in the ALTAN ecosystem
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handlePostJob}
          startIcon={<WorkIcon />}
        >
          Post Job
        </Button>
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search jobs by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <Button size="small" onClick={handleSearch}>
                      Search
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value as any)}
              >
                <MenuItem value="ALL">All Jobs</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Remote Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Location</InputLabel>
              <Select
                value={remoteFilter}
                label="Location"
                onChange={(e) => setRemoteFilter(e.target.value as any)}
              >
                <MenuItem value="ALL">All Locations</MenuItem>
                <MenuItem value="REMOTE">Remote Only</MenuItem>
                <MenuItem value="ONSITE">On-site Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Job Listings */}
      {loading && !jobs.length ? (
        <Stack spacing={2}>
          {[1, 2, 3, 4].map((n) => (
            <Card key={n}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={40} />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="100%" />
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : jobs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <WorkIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No jobs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Be the first to post a job!'}
          </Typography>
          {!searchQuery && (
            <Button variant="contained" onClick={handlePostJob}>
              Post Job
            </Button>
          )}
        </Box>
      ) : (
        <Stack spacing={2}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => handleViewJob(job.id)} />
          ))}
        </Stack>
      )}
    </Container>
  );
};

// JobCard Component
interface JobCardProps {
  job: Job;
  onClick: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
  const isOpen = isJobOpen(job);
  const deadlineText = formatDeadline(job.deadline);

  return (
    <Card
      sx={{
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.3s',
        opacity: isOpen ? 1 : 0.7,
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" component="div" gutterBottom fontWeight="bold">
              {job.title}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              <Chip
                label={job.status}
                color={getJobStatusColor(job.status) as any}
                size="small"
              />
              {job.remote && (
                <Chip
                  icon={<RemoteIcon />}
                  label="Remote"
                  size="small"
                  variant="outlined"
                  color="info"
                />
              )}
            </Box>
          </Box>
          <Typography variant="h5" color="primary" fontWeight="bold" sx={{ ml: 2 }}>
            {formatSalary(job.salary)} ALTAN
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {job.description.substring(0, 200)}
          {job.description.length > 200 && '...'}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {job.location || 'Remote'}
              </Typography>
            </Box>
          </Grid>
          {job.duration && (
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {job.duration}
                </Typography>
              </Box>
            </Grid>
          )}
          {job.deadline && (
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DeadlineIcon fontSize="small" color="action" />
                <Typography
                  variant="body2"
                  color={deadlineText.includes('Expired') ? 'error' : 'text.secondary'}
                >
                  {deadlineText}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant={isOpen ? 'contained' : 'outlined'}
          color="primary"
          fullWidth
          disabled={!isOpen}
        >
          {isOpen ? 'View & Apply' : 'Closed'}
        </Button>
      </CardActions>
    </Card>
  );
};
