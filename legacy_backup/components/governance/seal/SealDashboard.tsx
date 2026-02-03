import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { GavelOutlined, Add } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';

interface Seal {
  id: string;
  title: string;
  signer1: string;
  signer2: string;
  approvals: number;
  executed: boolean;
  createdAt: string;
}

export const SealDashboard: React.FC<{ userSeatId: string }> = ({ userSeatId }) => {
  const [seals, setSeals] = useState<Seal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'executed'>('all');
  const router = useRouter();

  useEffect(() => {
    loadSeals();
  }, [userSeatId]);

  const loadSeals = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/digital-seal/user/${userSeatId}`);
      setSeals(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load seals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (seal: Seal) => {
    if (seal.executed) {
      return <Chip label="EXECUTED" color="success" size="small" />;
    }
    if (seal.approvals === 2) {
      return <Chip label="APPROVED" color="info" size="small" />;
    }
    if (seal.approvals === 1) {
      return <Chip label="PARTIAL" color="warning" size="small" />;
    }
    return <Chip label="PENDING" color="default" size="small" />;
  };

  const filteredSeals = seals.filter((seal) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return seal.approvals < 2 && !seal.executed;
    if (filter === 'approved') return seal.approvals === 2 && !seal.executed;
    if (filter === 'executed') return seal.executed;
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GavelOutlined sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h5">Digital Seals</Typography>
              <Typography variant="body2" color="text.secondary">
                {seals.length} total seals
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/governance/seal/create')}
          >
            Create Seal
          </Button>
        </Box>

        {/* Filter Tabs */}
        <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 2 }}>
          <Tab label={`All (${seals.length})`} value="all" />
          <Tab
            label={`Pending (${seals.filter((s) => s.approvals < 2 && !s.executed).length})`}
            value="pending"
          />
          <Tab
            label={`Approved (${seals.filter((s) => s.approvals === 2 && !s.executed).length})`}
            value="approved"
          />
          <Tab label={`Executed (${seals.filter((s) => s.executed).length})`} value="executed" />
        </Tabs>

        {/* Table */}
        {filteredSeals.length === 0 ? (
          <Alert severity="info">No seals found</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Signers</TableCell>
                  <TableCell>Approvals</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSeals.map((seal) => (
                  <TableRow key={seal.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {seal.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        {seal.signer1.substring(0, 10)}...
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        {seal.signer2.substring(0, 10)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{seal.approvals}/2</TableCell>
                    <TableCell>{getStatusChip(seal)}</TableCell>
                    <TableCell>{new Date(seal.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => router.push(`/governance/seal/${seal.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
