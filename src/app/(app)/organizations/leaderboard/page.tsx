'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Trophy, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { RateOrganizationDialog, RatingData } from '@/components/organizations/RateOrganizationDialog';
import { getLeaderboard, rateOrganization } from '@/lib/api';
import { toast } from 'sonner';

interface LeaderboardOrganization {
  id: string;
  name: string;
  type: string;
  branch?: string;
  leader: {
    firstName: string;
    lastName: string;
  };
  trustScore: number;
  qualityScore: number;
  financialScore: number;
  overallRating: number;
  currentRank: number;
  previousRank?: number;
  contractsCompleted: number;
}

export default function LeaderboardPage() {
  const [organizations, setOrganizations] = useState<LeaderboardOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<LeaderboardOrganization | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard();
      setOrganizations(data as unknown as LeaderboardOrganization[]);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch leaderboard';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (org: LeaderboardOrganization) => {
    setSelectedOrg(org);
    setRatingDialogOpen(true);
  };

  const handleSubmitRating = async (ratings: RatingData) => {
    if (!selectedOrg) return;

    try {
      await rateOrganization(selectedOrg.id, ratings);
      toast.success(`Successfully rated ${selectedOrg.name}!`);
      setRatingDialogOpen(false);
      
      // Refresh leaderboard
      await fetchLeaderboard();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to submit rating';
      toast.error(errorMsg);
      throw err;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={20} color="#FFD700" />;
    if (rank === 2) return <Trophy size={20} color="#C0C0C0" />;
    if (rank === 3) return <Trophy size={20} color="#CD7F32" />;
    return null;
  };

  const getRankChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = previous - current;
    
    if (change > 0) {
      return (
        <Chip
          label={`+${change}`}
          size="small"
          icon={<TrendingUp size={14} />}
          color="success"
        />
      );
    } else if (change < 0) {
      return (
        <Chip
          label={Math.abs(change)}
          size="small"
          icon={<TrendingDown size={14} />}
          color="error"
        />
      );
    } else {
      return (
        <Chip
          label="—"
          size="small"
          icon={<Minus size={14} />}
          color="default"
        />
      );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'error';
  };

  const filteredOrgs = organizations.filter(org => 
    filterBranch === 'ALL' || org.branch === filterBranch
  );

  const top100 = filteredOrgs.slice(0, 100);

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Award size={32} />
            Топ-100 Организаций
          </Typography>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Ветвь</InputLabel>
            <Select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              label="Ветвь"
            >
              <MenuItem value="ALL">Все</MenuItem>
              <MenuItem value="LEGISLATIVE">Законодательная</MenuItem>
              <MenuItem value="EXECUTIVE">Исполнительная</MenuItem>
              <MenuItem value="JUDICIAL">Судебная</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <LinearProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={80}>Место</TableCell>
                  <TableCell>Организация</TableCell>
                  <TableCell>Лидер</TableCell>
                  <TableCell align="center">Финансы</TableCell>
                  <TableCell align="center">Доверие</TableCell>
                  <TableCell align="center">Качество</TableCell>
                  <TableCell align="center">Общий</TableCell>
                  <TableCell align="center">Изменение</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {top100.map((org) => (
                  <TableRow
                    key={org.id}
                    sx={{
                      bgcolor: org.currentRank <= 3 ? 'action.hover' : 'inherit',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    {/* Rank */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getRankIcon(org.currentRank)}
                        <Typography variant="h6">#{org.currentRank}</Typography>
                      </Box>
                    </TableCell>

                    {/* Organization */}
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {org.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {org.type}
                        {org.branch && ` • ${org.branch}`}
                      </Typography>
                    </TableCell>

                    {/* Leader */}
                    <TableCell>
                      <Typography variant="body2">
                        {org.leader.firstName} {org.leader.lastName}
                      </Typography>
                    </TableCell>

                    {/* Financial Score */}
                    <TableCell align="center">
                      <Chip
                        label={org.financialScore.toFixed(1)}
                        color={getScoreColor(org.financialScore)}
                        size="small"
                      />
                    </TableCell>

                    {/* Trust Score */}
                    <TableCell align="center">
                      <Chip
                        label={org.trustScore.toFixed(1)}
                        color={getScoreColor(org.trustScore)}
                        size="small"
                      />
                    </TableCell>

                    {/* Quality Score */}
                    <TableCell align="center">
                      <Chip
                        label={org.qualityScore.toFixed(1)}
                        color={getScoreColor(org.qualityScore)}
                        size="small"
                      />
                    </TableCell>

                    {/* Overall Rating */}
                    <TableCell align="center">
                      <Typography variant="h6" color="primary">
                        {org.overallRating.toFixed(1)}
                      </Typography>
                    </TableCell>

                    {/* Rank Change */}
                    <TableCell align="center">
                      {getRankChange(org.currentRank, org.previousRank)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          href={`/organizations/${org.id}`}
                        >
                          Профиль
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleRate(org)}
                        >
                          Оценить
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && top100.length === 0 && (
          <Alert severity="info">Нет организаций для отображения</Alert>
        )}
      </Container>

      {/* Rating Dialog */}
      {selectedOrg && (
        <RateOrganizationDialog
          open={ratingDialogOpen}
          onClose={() => setRatingDialogOpen(false)}
          organizationName={selectedOrg.name}
          organizationId={selectedOrg.id}
          onSubmit={handleSubmitRating}
        />
      )}
    </>
  );
}
