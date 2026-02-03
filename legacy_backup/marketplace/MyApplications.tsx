/**
 * MyApplications Component
 * 
 * Job seeker's application tracking dashboard with:
 * - All submitted applications
 * - Application status tracking
 * - Filtering by status
 * - Withdraw application
 * - Application history
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
  Grid,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  AttachMoney as SalaryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useJobMarketplace } from '../../hooks/useJobMarketplace';
import {
  JobApplication,
  formatSalary,
  getApplicationStatusColor,
} from '../../lib/api/jobMarketplace.api';

export const MyApplications: React.FC = () => {
  const navigate = useNavigate();
  const {
    myApplications,
    loading,
    error,
    fetchMyApplications,
    withdrawApplication,
    clearError,
  } = useJobMarketplace();

  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const filteredApplications = selectedStatus === 'ALL'
    ? myApplications
    : myApplications.filter((app) => app.status === selectedStatus);

  const stats = {
    total: myApplications.length,
    pending: myApplications.filter((a) => a.status === 'PENDING').length,
    accepted: myApplications.filter((a) => a.status === 'ACCEPTED').length,
    rejected: myApplications.filter((a) => a.status === 'REJECTED').length,
  };

  const handleWithdraw = async () => {
    if (selectedApplication) {
      const success = await withdrawApplication(selectedApplication);
      if (success) {
        fetchMyApplications();
      }
    }
    setWithdrawDialogOpen(false);
    setSelectedApplication(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          My Applications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your job applications and responses
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <WorkIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Applications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <WorkIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.accepted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Accepted
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <WorkIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.rejected}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rejected
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Card>
        <Tabs
          value={selectedStatus}
          onChange={(_, v) => setSelectedStatus(v)}
        >
          <Tab label={`All (${stats.total})`} value="ALL" />
          <Tab label={`Pending (${stats.pending})`} value="PENDING" />
          <Tab label={`Accepted (${stats.accepted})`} value="ACCEPTED" />
          <Tab label={`Rejected (${stats.rejected})`} value="REJECTED" />
        </Tabs>

        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredApplications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No applications found
              </Typography>
              <Button variant="contained" onClick={() => navigate('/jobs')} sx={{ mt: 2 }}>
                Browse Jobs
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {filteredApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onView={() => navigate(`/jobs/${application.jobId}`)}
                  onWithdraw={() => {
                    setSelectedApplication(application.id);
                    setWithdrawDialogOpen(true);
                  }}
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={withdrawDialogOpen} onClose={() => setWithdrawDialogOpen(false)}>
        <DialogTitle>Withdraw Application</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to withdraw this application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleWithdraw} color="error" variant="contained">
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// ApplicationCard Component
interface ApplicationCardProps {
  application: JobApplication;
  onView: () => void;
  onWithdraw: () => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onView, onWithdraw }) => {
  const job = application.job;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {job?.title || 'Job Title'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Chip
                label={application.status}
                color={getApplicationStatusColor(application.status) as any}
                size="small"
              />
            </Box>
          </Box>
          {job && (
            <Typography variant="h5" color="primary" fontWeight="bold">
              {formatSalary(job.salary)} ALTAN
            </Typography>
          )}
        </Box>

        {job && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {job.location || 'Remote'}
                </Typography>
              </Box>
            </Grid>
            {job.duration && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {job.duration}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Applied: {new Date(application.appliedAt).toLocaleDateString()}
          {application.respondedAt && (
            <> • Responded: {new Date(application.respondedAt).toLocaleDateString()}</>
          )}
        </Typography>

        {application.notes && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Employer Notes:</strong> {application.notes}
            </Typography>
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={onView}>
            View Job
          </Button>
          {application.status === 'PENDING' && (
            <Button variant="outlined" size="small" color="error" onClick={onWithdraw}>
              Withdraw
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
