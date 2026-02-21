import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Fab,
  CircularProgress,
  Alert,
  Paper,
  InputAdornment,
  TextField,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useVotingCenter, KhuralLevel, Proposal, ProposalStatus } from '../../hooks/useVotingCenter';
import VotingCard from './VotingCard';

interface ProposalListProps {
  userAddress?: string;
  onCreateClick?: () => void;
  onVote?: (proposalId: number, support: boolean) => void;
  onFinalize?: (proposalId: number) => void;
}

/**
 * @component ProposalList
 * @description List of proposals with filtering
 */
export const ProposalList: React.FC<ProposalListProps> = ({
  userAddress,
  onCreateClick,
  onVote,
  onFinalize,
}) => {
  const { proposals, loading, error, fetchProposals } = useVotingCenter();
  const [level, setLevel] = useState<KhuralLevel>(KhuralLevel.ARBAD);
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProposals(level);
  }, [level, fetchProposals]);

  const handleLevelChange = (_: React.MouseEvent, newLevel: KhuralLevel | null) => {
    if (newLevel !== null) {
      setLevel(newLevel);
    }
  };

  const handleStatusChange = (_: React.MouseEvent, newStatus: ProposalStatus | 'all' | null) => {
    if (newStatus !== null) {
      setStatusFilter(newStatus);
    }
  };

  // Filter proposals
  const filteredProposals = proposals.filter((proposal) => {
    // Status filter
    if (statusFilter !== 'all' && proposal.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        proposal.title.toLowerCase().includes(query) ||
        proposal.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Legislative Proposals
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        View and vote on proposals across all Khural levels
      </Typography>

      {/* Level Selector */}
      <Box mb={3}>
        <Typography variant="body2" gutterBottom fontWeight="bold">
          Khural Level
        </Typography>
        <ToggleButtonGroup
          value={level}
          exclusive
          onChange={handleLevelChange}
          fullWidth
          size="large"
        >
          <ToggleButton value={KhuralLevel.ARBAD}>
            Arbad (Local)
          </ToggleButton>
          <ToggleButton value={KhuralLevel.ZUN}>
            Zun (Regional)
          </ToggleButton>
          <ToggleButton value={KhuralLevel.MYANGAD}>
            Myangad (Provincial)
          </ToggleButton>
          <ToggleButton value={KhuralLevel.TUMED}>
            Tumed (National)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Stack spacing={2}>
          {/* Search */}
          <TextField
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />

          {/* Status Filter */}
          <Box>
            <Typography variant="body2" gutterBottom fontWeight="bold">
              Status
            </Typography>
            <ToggleButtonGroup
              value={statusFilter}
              exclusive
              onChange={handleStatusChange}
              fullWidth
              size="small"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value={ProposalStatus.ACTIVE}>Active</ToggleButton>
              <ToggleButton value={ProposalStatus.PASSED}>Passed</ToggleButton>
              <ToggleButton value={ProposalStatus.REJECTED}>Rejected</ToggleButton>
              <ToggleButton value={ProposalStatus.EXECUTED}>Executed</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Proposals */}
      {!loading && filteredProposals.length === 0 && (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No proposals found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Be the first to create a proposal!'}
          </Typography>
        </Paper>
      )}

      {!loading && filteredProposals.map((proposal) => (
        <VotingCard
          key={proposal.proposalId}
          proposal={proposal}
          userAddress={userAddress}
          onVote={onVote}
          onFinalize={onFinalize}
        />
      ))}

      {/* Create FAB */}
      {onCreateClick && (
        <Fab
          color="primary"
          aria-label="create proposal"
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
          onClick={onCreateClick}
        >
          <Add />
        </Fab>
      )}

      {/* Summary */}
      {!loading && filteredProposals.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
          <Stack direction="row" spacing={4} justifyContent="center">
            <Box textAlign="center">
              <Typography variant="h6" fontWeight="bold">
                {filteredProposals.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Proposals
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight="bold">
                {filteredProposals.filter(p => p.status === ProposalStatus.ACTIVE).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight="bold">
                {filteredProposals.filter(p => p.status === ProposalStatus.PASSED).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Passed
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}
    </Container>
  );
};

export default ProposalList;
