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
import { Science, Add } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';

interface Patent {
  id: string;
  patentId: number;
  title: string;
  field: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

interface Discovery {
  id: string;
  discoveryId: number;
  title: string;
  reviewCount: number;
  verified: boolean;
  submittedAt: string;
}

interface Grant {
  id: string;
  grantId: number;
  amount: string;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  submittedAt: string;
}

type TabType = 'patents' | 'discoveries' | 'grants';

export const AcademyDashboard: React.FC<{ userSeatId: string }> = ({ userSeatId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('patents');
  const [patents, setPatents] = useState<Patent[]>([]);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [userSeatId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'patents') {
        const response = await axios.get(`/api/academy/patents/user/${userSeatId}`);
        setPatents(response.data);
      } else if (activeTab === 'discoveries') {
        const response = await axios.get(`/api/academy/discoveries/user/${userSeatId}`);
        setDiscoveries(response.data);
      } else {
        const response = await axios.get(`/api/academy/grants/user/${userSeatId}`);
        setGrants(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'DISBURSED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderPatentsTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Field</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patents.map((patent) => (
            <TableRow key={patent.id} hover>
              <TableCell>#{patent.patentId}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {patent.title}
                </Typography>
              </TableCell>
              <TableCell>{patent.field}</TableCell>
              <TableCell>
                <Chip label={patent.status} color={getStatusColor(patent.status)} size="small" />
              </TableCell>
              <TableCell>{new Date(patent.submittedAt).toLocaleDateString()}</TableCell>
              <TableCell align="right">
                <Button size="small">View</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderDiscoveriesTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Reviews</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {discoveries.map((discovery) => (
            <TableRow key={discovery.id} hover>
              <TableCell>#{discovery.discoveryId}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {discovery.title}
                </Typography>
              </TableCell>
              <TableCell>{discovery.reviewCount}/2</TableCell>
              <TableCell>
                <Chip
                  label={discovery.verified ? 'VERIFIED' : 'PENDING'}
                  color={discovery.verified ? 'success' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell>{new Date(discovery.submittedAt).toLocaleDateString()}</TableCell>
              <TableCell align="right">
                <Button size="small">View</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderGrantsTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Purpose</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {grants.map((grant) => (
            <TableRow key={grant.id} hover>
              <TableCell>#{grant.grantId}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {grant.purpose}
                </Typography>
              </TableCell>
              <TableCell>{grant.amount} ₳</TableCell>
              <TableCell>
                <Chip label={grant.status} color={getStatusColor(grant.status)} size="small" />
              </TableCell>
              <TableCell>{new Date(grant.submittedAt).toLocaleDateString()}</TableCell>
              <TableCell align="right">
                <Button size="small">View</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Science sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h5">Academy of Sciences</Typography>
              <Typography variant="body2" color="text.secondary">
                Your research portfolio
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              const routes: Record<TabType, string> = {
                patents: '/governance/academy/patent/submit',
                discoveries: '/governance/academy/discovery/submit',
                grants: '/governance/academy/grant/submit',
              };
              router.push(routes[activeTab]);
            }}
          >
            Submit {activeTab === 'patents' ? 'Patent' : activeTab === 'discoveries' ? 'Discovery' : 'Grant'}
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Patents (${patents.length})`} value="patents" />
          <Tab label={`Discoveries (${discoveries.length})`} value="discoveries" />
          <Tab label={`Grants (${grants.length})`} value="grants" />
        </Tabs>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {activeTab === 'patents' && (patents.length === 0 ? (
              <Alert severity="info">No patents submitted yet</Alert>
            ) : (
              renderPatentsTable()
            ))}
            {activeTab === 'discoveries' && (discoveries.length === 0 ? (
              <Alert severity="info">No discoveries registered yet</Alert>
            ) : (
              renderDiscoveriesTable()
            ))}
            {activeTab === 'grants' && (grants.length === 0 ? (
              <Alert severity="info">No grants requested yet</Alert>
            ) : (
              renderGrantsTable()
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};
