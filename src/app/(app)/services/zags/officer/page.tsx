'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Favorite as MarriageIcon,
  HeartBroken as DivorceIcon,
} from '@mui/icons-material';
import { getAllMarriages, type Marriage } from '@/lib/api/zags';

export default function ZAGSOfficerPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarriages();
  }, []);

  const loadMarriages = async () => {
    try {
      setLoading(true);
      const data = await getAllMarriages();
      setMarriages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marriages');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: marriages.length,
    pendingReview: marriages.filter((m) => m.status === 'PENDING_REVIEW').length,
    approved: marriages.filter((m) => m.status === 'APPROVED').length,
    registered: marriages.filter((m) => m.status === 'REGISTERED').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_CONSENT':
        return 'info';
      case 'PENDING_REVIEW':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REGISTERED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredMarriages = tab === 0
    ? marriages
    : tab === 1
    ? marriages.filter((m) => m.status === 'PENDING_REVIEW')
    : tab === 2
    ? marriages.filter((m) => m.status === 'APPROVED' || m.status === 'REGISTERED')
    : marriages.filter((m) => m.status === 'REJECTED' || m.status === 'CANCELLED');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          ZAGS Officer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve marriage registrations
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
              <MarriageIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} color="warning.main">
                  {stats.pendingReview}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Review
                </Typography>
              </Box>
              <MarriageIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {stats.approved}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved
                </Typography>
              </Box>
              <ApproveIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {stats.registered}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registered
                </Typography>
              </Box>
              <MarriageIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="All Applications" />
          <Tab label="Pending Review" />
          <Tab label="Approved/Registered" />
          <Tab label="Rejected/Cancelled" />
        </Tabs>
      </Card>

      {/* Marriages Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Marriage Applications
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredMarriages.length === 0 ? (
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
                    <TableCell>Spouses</TableCell>
                    <TableCell>Marriage Date</TableCell>
                    <TableCell>Ceremony Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Certificate</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMarriages.map((marriage) => (
                    <TableRow key={marriage.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {marriage.spouse1FullName}
                          </Typography>
                          <Typography variant="body2">
                            {marriage.spouse2FullName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(marriage.marriageDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={marriage.ceremonyType || 'Civil'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={marriage.status}
                          color={getStatusColor(marriage.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {marriage.certificateNumber ? (
                          <Typography variant="caption">{marriage.certificateNumber}</Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not issued
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/services/zags/officer/review/${marriage.id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {marriage.status === 'PENDING_REVIEW' && (
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
