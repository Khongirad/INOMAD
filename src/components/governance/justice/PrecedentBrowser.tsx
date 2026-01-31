import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Collapse,
} from '@mui/material';
import { Gavel, Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import axios from 'axios';

interface Precedent {
  id: string;
  precedentId: number;
  caseId: number;
  legalPrinciple: string;
  summary: string;
  rulingType: 'CIVIL' | 'CRIMINAL' | 'ADMINISTRATIVE';
  establishedAt: string;
}

export const PrecedentBrowser: React.FC = () => {
  const [precedents, setPrecedents] = useState<Precedent[]>([]);
  const [filteredPrecedents, setFilteredPrecedents] = useState<Precedent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // For demo, we'll search all precedents
    // In production, you'd want pagination or specific endpoints
    loadPrecedents();
  }, []);

  useEffect(() => {
    filterPrecedents();
  }, [precedents, searchQuery]);

  const loadPrecedents = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Need a backend endpoint to list all precedents
      // For now, this is a placeholder
      setPrecedents([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load precedents');
    } finally {
      setLoading(false);
    }
  };

  const filterPrecedents = () => {
    if (!searchQuery) {
      setFilteredPrecedents(precedents);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = precedents.filter(
      (p) =>
        p.legalPrinciple.toLowerCase().includes(query) ||
        p.summary.toLowerCase().includes(query)
    );
    setFilteredPrecedents(filtered);
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
    <Card sx={{ maxWidth: 1000, mx: 'auto', mt: 4 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Gavel sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Legal Precedents</Typography>
            <Typography variant="body2" color="text.secondary">
              Browse established legal principles
            </Typography>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search by legal principle or summary..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {/* Info */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Legal precedents are established through Council of Justice rulings. 
            They serve as reference points for future cases.
          </Typography>
        </Alert>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredPrecedents.length === 0 ? (
          <Alert severity="info">
            {searchQuery ? 'No precedents match your search' : 'No precedents found'}
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Legal Principle</TableCell>
                  <TableCell>Case Type</TableCell>
                  <TableCell>Source Case</TableCell>
                  <TableCell>Established</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPrecedents.map((precedent) => (
                  <React.Fragment key={precedent.id}>
                    <TableRow hover>
                      <TableCell>#{precedent.precedentId}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {precedent.legalPrinciple}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={precedent.rulingType}
                          color={getCaseTypeColor(precedent.rulingType)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => {/* Navigate to case */}}
                        >
                          Case #{precedent.caseId}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(precedent.establishedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() =>
                            setExpandedId(expandedId === precedent.id ? null : precedent.id)
                          }
                          endIcon={expandedId === precedent.id ? <ExpandLess /> : <ExpandMore />}
                        >
                          {expandedId === precedent.id ? 'Hide' : 'Details'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={expandedId === precedent.id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Summary
                            </Typography>
                            <Typography variant="body2">{precedent.summary}</Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Demo Notice */}
        {precedents.length === 0 && !loading && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Development Note:</strong> This component requires a backend endpoint to list all precedents. 
              Currently showing empty results.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
