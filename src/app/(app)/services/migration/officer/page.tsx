'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Pending as PendingIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material';
import { getAllPassportApplications, type PassportApplication } from '@/lib/api/migration';

const STATUS_FILTERS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_DOCUMENTS'] as const;

export default function MigrationOfficerPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [applications, setApplications] = useState<PassportApplication[]>([]);
  const [filteredApps, setFilteredApps] = useState<PassportApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('ALL');

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getAllPassportApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    if (statusFilter === 'ALL') {
      setFilteredApps(applications);
    } else {
      setFilteredApps(applications.filter((app) => app.status === statusFilter));
    }
  };

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'SUBMITTED').length,
    underReview: applications.filter((a) => a.status === 'UNDER_REVIEW').length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    issued: applications.filter((a) => a.status === 'ISSUED').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'info';
      case 'UNDER_REVIEW':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'ISSUED':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Migration Officer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and process passport applications
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Applications
                </Typography>
              </Box>
              <StatsIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} color="info.main">
                  {stats.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Review
                </Typography>
              </Box>
              <PendingIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} color="warning.main">
                  {stats.underReview}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Under Review
                </Typography>
              </Box>
              <PendingIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {stats.approved + stats.issued}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved/Issued
                </Typography>
              </Box>
              <ApproveIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="All Applications" />
          <Tab label="Pending Review" />
          <Tab label="Under Review" />
          <Tab label="Processed" />
        </Tabs>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Applications
            </Typography>
            <Stack direction="row" spacing={1}>
              {STATUS_FILTERS.map((filter) => (
                <Chip
                  key={filter}
                  label={filter.replace('_', ' ')}
                  onClick={() => setStatusFilter(filter)}
                  color={statusFilter === filter ? 'primary' : 'default'}
                  variant={statusFilter === filter ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredApps.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No applications found
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Passport Type</TableCell>
                    <TableCell>Submitted Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {app.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            DOB: {new Date(app.dateOfBirth).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={app.passportType} size="small" />
                      </TableCell>
                      <TableCell>
                        {new Date(app.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={app.status}
                          color={getStatusColor(app.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/services/migration/officer/review/${app.id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {app.status === 'SUBMITTED' && (
                          <>
                            <Tooltip title="Quick Approve">
                              <IconButton size="small" color="success">
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Quick Reject">
                              <IconButton size="small" color="error">
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
