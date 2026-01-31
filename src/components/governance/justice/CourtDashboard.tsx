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
import { Gavel, Add } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';

interface JudicialCase {
  id: string;
  caseId: number;
  plaintiff: string;
  defendant: string;
  rulingType: 'CIVIL' | 'CRIMINAL' | 'ADMINISTRATIVE';
  status: 'PENDING' | 'ASSIGNED' | 'UNDER_REVIEW' | 'RULED' | 'APPEALED' | 'CLOSED';
  filedAt: string;
}

type TabType = 'plaintiff' | 'defendant' | 'judge';

export const CourtDashboard: React.FC<{ userSeatId: string; isJudge?: boolean }> = ({
  userSeatId,
  isJudge = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('plaintiff');
  const [cases, setCases] = useState<JudicialCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadCases();
  }, [userSeatId, activeTab]);

  const loadCases = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      if (activeTab === 'plaintiff') {
        endpoint = `/api/justice/cases/plaintiff/${userSeatId}`;
      } else if (activeTab === 'defendant') {
        endpoint = `/api/justice/cases/defendant/${userSeatId}`;
      } else {
        // TODO: Judge cases endpoint
        endpoint = `/api/justice/cases/judge/${userSeatId}`;
      }

      const response = await axios.get(endpoint);
      setCases(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOSED':
        return 'success';
      case 'RULED':
        return 'info';
      case 'UNDER_REVIEW':
        return 'primary';
      case 'ASSIGNED':
        return 'secondary';
      case 'PENDING':
        return 'warning';
      case 'APPEALED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCaseTypeColor = (type: string) => {
    switch (type) {
      case 'CRIMINAL':
        return 'error';
      case 'CIVIL':
        return 'primary';
      case 'ADMINISTRATIVE':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Gavel sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h5">Council of Justice</Typography>
              <Typography variant="body2" color="text.secondary">
                {isJudge ? 'Judge Dashboard' : 'Your Cases'}
              </Typography>
            </Box>
          </Box>
          {!isJudge && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => router.push('/governance/justice/case/file')}
            >
              File Case
            </Button>
          )}
        </Box>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="As Plaintiff" value="plaintiff" />
          <Tab label="As Defendant" value="defendant" />
          {isJudge && <Tab label="Assigned to Me" value="judge" />}
        </Tabs>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : cases.length === 0 ? (
          <Alert severity="info">No cases found</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Case ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Plaintiff</TableCell>
                  <TableCell>Defendant</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Filed</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id} hover>
                    <TableCell>#{caseItem.caseId}</TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.rulingType}
                        color={getCaseTypeColor(caseItem.rulingType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {caseItem.plaintiff.substring(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {caseItem.defendant.substring(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={caseItem.status}
                        color={getStatusColor(caseItem.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(caseItem.filedAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => router.push(`/governance/justice/case/${caseItem.id}`)}
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
