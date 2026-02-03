/**
 * JobDetail Component
 * 
 * Single job view with:
 * - Full job description
 * - Requirements
 * - Salary and duration
 * - Application form
 * - Employer information
 * - Application status tracking
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import {
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  AttachMoney as SalaryIcon,
  Business as EmployerIcon,
  RemoteWork as RemoteIcon,
  DeadlineIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobMarketplace } from '../../hooks/useJobMarketplace';
import {
  formatSalary,
  formatDeadline,
  isJobOpen,
  getJobStatusColor,
} from '../../lib/api/jobMarketplace.api';

export const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, loading, error, getJob, applyForJob, clearError } = useJobMarketplace();

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (id) {
      getJob(id);
    }
  }, [id]);

  const handleApply = async () => {
    if (!currentJob || !coverLetter.trim()) return;

    setApplying(true);
    const application = await applyForJob(currentJob.id, {
      coverLetter,
      resumeUrl: resumeUrl || undefined,
      expectedSalary: expectedSalary || undefined,
    });

    setApplying(false);

    if (application) {
      setApplyDialogOpen(false);
      // Navigate to applications page
      navigate('/jobs/my-applications');
    }
  };

  if (loading || !currentJob) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  const isOpen = isJobOpen(currentJob);
  const deadlineText = formatDeadline(currentJob.deadline);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button onClick={() => navigate('/jobs')} sx={{ mb: 2 }}>
        ← Back to Job Board
      </Button>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Job Info */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              {/* Header */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={currentJob.status}
                    color={getJobStatusColor(currentJob.status) as any}
                  />
                  {currentJob.remote && (
                    <Chip
                      icon={<RemoteIcon />}
                      label="Remote"
                      variant="outlined"
                      color="info"
                    />
                  )}
                </Box>

                <Typography variant="h3" fontWeight="bold" gutterBottom>
                  {currentJob.title}
                </Typography>

                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon color="action" />
                      <Typography color="text.secondary">
                        {currentJob.location || 'Remote'}
                      </Typography>
                    </Box>
                  </Grid>
                  {currentJob.duration && (
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon color="action" />
                        <Typography color="text.secondary">
                          {currentJob.duration}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                  {currentJob.deadline && (
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DeadlineIcon color="action" />
                        <Typography
                          color={deadlineText.includes('Expired') ? 'error' : 'text.secondary'}
                        >
                          {deadlineText}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Salary */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Compensation
                </Typography>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {formatSalary(currentJob.salary)} ALTAN
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Description */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Job Description
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ whiteSpace: 'pre-line' }}>
                  {currentJob.description}
                </Typography>
              </Box>

              {/* Requirements */}
              {currentJob.requirements && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Requirements
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      paragraph
                      sx={{ whiteSpace: 'pre-line' }}
                    >
                      {currentJob.requirements}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Apply Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Apply for this Position
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<WorkIcon />}
                  onClick={() => setApplyDialogOpen(true)}
                  disabled={!isOpen}
                  sx={{ mb: 2 }}
                >
                  {isOpen ? 'Apply Now' : 'Position Closed'}
                </Button>
                {!isOpen && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    This position is no longer accepting applications
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Employer Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Employer
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 56, height: 56 }}>
                    <EmployerIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Posted by
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      Employer #{currentJob.employerId.substring(0, 8)}...
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Job Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Job Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Posted
                    </Typography>
                    <Typography variant="body2">
                      {new Date(currentJob.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {currentJob.deadline && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Application Deadline
                      </Typography>
                      <Typography variant="body2">
                        {new Date(currentJob.deadline).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body2">
                      {currentJob.status.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Application Dialog */}
      <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Apply for {currentJob.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Cover Letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              multiline
              rows={6}
              fullWidth
              required
              placeholder="Tell the employer why you're a great fit for this position..."
            />

            <TextField
              label="Resume URL"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              fullWidth
              placeholder="https://..."
              helperText="Optional: Link to your resume or portfolio"
            />

            <TextField
              label="Expected Salary (ALTAN)"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
              type="number"
              fullWidth
              placeholder="8000.00"
              helperText="Optional: Your salary expectations"
            />

            <Alert severity="info">
              Your application will be sent to the employer for review. You'll be notified of their decision.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={applying || !coverLetter.trim()}
          >
            {applying ? <CircularProgress size={24} /> : 'Submit Application'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
