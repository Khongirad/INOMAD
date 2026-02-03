import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Grid,
  Stack,
  Divider,
} from '@mui/material';
import {
  HowToVote,
  CheckCircle,
  Cancel,
  Timer,
  People,
} from '@mui/icons-material';
import {
  useVotingCenter,
  Proposal,
  ProposalStatus,
  getProposalTypeLabel,
  getStatusLabel,
  getLevelLabel,
  getParticipationRate,
  isProposalActive,
  isQuorumMet,
} from '../../hooks/useVotingCenter';

interface VotingCardProps {
  proposal: Proposal;
  userAddress?: string;
  onVote?: (proposalId: number, support: boolean) => void;
  onFinalize?: (proposalId: number) => void;
}

/**
 * @component VotingCard
 * @description Card for displaying proposal and voting
 */
export const VotingCard: React.FC<VotingCardProps> = ({
  proposal,
  userAddress,
  onVote,
  onFinalize,
}) => {
  const { hasVoted } = useVotingCenter();
  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  const active = isProposalActive(proposal);
  const quorumMet = isQuorumMet(proposal);
  const participationRate = getParticipationRate(proposal);
  
  const totalVotes = proposal.results.votesFor + proposal.results.votesAgainst;
  const approvalRate = totalVotes > 0 
    ? (proposal.results.votesFor / totalVotes) * 100 
    : 0;

  useEffect(() => {
    if (userAddress) {
      hasVoted(proposal.proposalId, userAddress).then(setVoted);
    }
  }, [proposal.proposalId, userAddress, hasVoted]);

  const handleVote = async (support: boolean) => {
    if (!onVote) return;
    setVoting(true);
    try {
      await onVote(proposal.proposalId, support);
      setVoted(true);
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setVoting(false);
    }
  };

  const getStatusColor = () => {
    switch (proposal.status) {
      case ProposalStatus.ACTIVE:
        return 'primary';
      case ProposalStatus.PASSED:
        return 'success';
      case ProposalStatus.REJECTED:
        return 'error';
      case ProposalStatus.EXECUTED:
        return 'info';
      default:
        return 'default';
    }
  };

  const timeRemaining = new Date(proposal.endTime).getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  return (
    <Card sx={{ mb: 2, position: 'relative', overflow: 'visible' }}>
      {/* Status badge */}
      <Chip
        label={getStatusLabel(proposal.status)}
        color={getStatusColor()}
        size="small"
        sx={{ position: 'absolute', top: 16, right: 16 }}
      />

      <CardContent>
        {/* Header */}
        <Stack direction="row" spacing={1} mb={2}>
          <Chip
            label={getProposalTypeLabel(proposal.proposalType)}
            size="small"
            variant="outlined"
          />
          <Chip
            label={getLevelLabel(proposal.khuralLevel)}
            size="small"
            variant="outlined"
            color="secondary"
          />
          <Chip
            label={`#${proposal.proposalId}`}
            size="small"
            variant="outlined"
          />
        </Stack>

        {/* Title */}
        <Typography variant="h6" gutterBottom>
          {proposal.title}
        </Typography>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" paragraph>
          {proposal.description}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Voting Results */}
        <Box mb={2}>
          <Stack direction="row" justifyContent="space-between" mb={1}>
            <Typography variant="body2" fontWeight="bold">
              Votes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalVotes} / {proposal.results.totalEligible}
            </Typography>
          </Stack>

          {/* For votes */}
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <CheckCircle fontSize="small" color="success" />
            <Box flexGrow={1}>
              <LinearProgress
                variant="determinate"
                value={approvalRate}
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" minWidth={60} textAlign="right">
              {proposal.results.votesFor} ({approvalRate.toFixed(1)}%)
            </Typography>
          </Stack>

          {/* Against votes */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Cancel fontSize="small" color="error" />
            <Box flexGrow={1}>
              <LinearProgress
                variant="determinate"
                value={100 - approvalRate}
                color="error"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" minWidth={60} textAlign="right">
              {proposal.results.votesAgainst} ({(100 - approvalRate).toFixed(1)}%)
            </Typography>
          </Stack>
        </Box>

        {/* Stats */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Stack direction="row" spacing={1} alignItems="center">
              <People fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Participation
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {participationRate.toFixed(1)}%
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={6}>
            <Stack direction="row" spacing={1} alignItems="center">
              <HowToVote fontSize="small" color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Quorum
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {quorumMet ? '✓ Met' : `${totalVotes}/${proposal.results.quorumRequired}`}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {active && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Timer fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Time Remaining
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {daysRemaining > 0
                      ? `${daysRemaining} days, ${hoursRemaining % 24} hours`
                      : `${hoursRemaining} hours`}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          )}
        </Grid>

        {/* Voting Buttons */}
        {active && !voted && onVote && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<CheckCircle />}
              onClick={() => handleVote(true)}
              disabled={voting}
            >
              Vote For
            </Button>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              startIcon={<Cancel />}
              onClick={() => handleVote(false)}
              disabled={voting}
            >
              Vote Against
            </Button>
          </Stack>
        )}

        {voted && (
          <Chip
            label="You have voted"
            color="info"
            icon={<CheckCircle />}
            sx={{ width: '100%' }}
          />
        )}

        {/* Finalize Button */}
        {!active && !proposal.finalized && onFinalize && (
          <Button
            variant="contained"
            fullWidth
            onClick={() => onFinalize(proposal.proposalId)}
          >
            Finalize Proposal
          </Button>
        )}

        {/* Proposer */}
        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          Proposed by: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default VotingCard;
