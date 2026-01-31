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
  TextField,
  InputAdornment,
} from '@mui/material';
import { AccountBalance, Add, Search, Verified } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';

interface TempleRecord {
  id: string;
  recordId: number;
  title: string;
  recordType: 'LIBRARY' | 'ARCHIVE' | 'CADASTRE';
  submitter: string;
  verified: boolean;
  submittedAt: string;
  metadata: string;
}

type RecordType = 'LIBRARY' | 'ARCHIVE' | 'CADASTRE' | 'ALL';

export const TempleArchive: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RecordType>('ALL');
  const [records, setRecords] = useState<TempleRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TempleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadRecords();
  }, [activeTab]);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'ALL') {
        // Load all records - would need a backend endpoint for this
        // For now, load each type separately
        const [library, archive, cadastre] = await Promise.all([
          axios.get('/api/temple/records/type/LIBRARY'),
          axios.get('/api/temple/records/type/ARCHIVE'),
          axios.get('/api/temple/records/type/CADASTRE'),
        ]);
        setRecords([...library.data, ...archive.data, ...cadastre.data]);
      } else {
        const response = await axios.get(`/api/temple/records/type/${activeTab}`);
        setRecords(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    if (!searchQuery) {
      setFilteredRecords(records);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = records.filter(
      (record) =>
        record.title.toLowerCase().includes(query) ||
        record.metadata.toLowerCase().includes(query)
    );
    setFilteredRecords(filtered);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LIBRARY':
        return '📚';
      case 'ARCHIVE':
        return '📜';
      case 'CADASTRE':
        return '🗺️';
      default:
        return '📄';
    }
  };

  const getCounts = () => {
    return {
      all: records.length,
      library: records.filter((r) => r.recordType === 'LIBRARY').length,
      archive: records.filter((r) => r.recordType === 'ARCHIVE').length,
      cadastre: records.filter((r) => r.recordType === 'CADASTRE').length,
    };
  };

  const counts = getCounts();

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h5">Temple of Heaven</Typography>
              <Typography variant="body2" color="text.secondary">
                Archive • Library • Cadastre
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/governance/temple/submit')}
          >
            Submit Record
          </Button>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search records by title or metadata..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label={`All (${counts.all})`} value="ALL" />
          <Tab label={`📚 Library (${counts.library})`} value="LIBRARY" />
          <Tab label={`📜 Archive (${counts.archive})`} value="ARCHIVE" />
          <Tab label={`🗺️ Cadastre (${counts.cadastre})`} value="CADASTRE" />
        </Tabs>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredRecords.length === 0 ? (
          <Alert severity="info">
            {searchQuery ? 'No records match your search' : 'No records found'}
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Submitter</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>#{record.recordId}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${getTypeIcon(record.recordType)} ${record.recordType}`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {record.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {record.metadata.substring(0, 60)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {record.submitter.substring(0, 12)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {record.verified ? (
                        <Chip
                          icon={<Verified />}
                          label="VERIFIED"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip label="UNVERIFIED" color="warning" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(record.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Button size="small">View</Button>
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
