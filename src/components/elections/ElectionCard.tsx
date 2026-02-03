'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Avatar,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import { Vote, Users, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';

interface Candidate {
  id: string;
  candidate: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  platform?: string;
  votes: number;
}

interface Election {
  id: string;
  organization: {
    id: string;
    name: string;
    type: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate: Date;
  totalVotes: number;
  turnoutRate?: number;
  winner?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  winnerVotes?: number;
  candidates: Candidate[];
}

interface ElectionCardProps {
  election: Election;
  onVote?: (electionId: string, candidateId: string) => Promise<void>;
  hasVoted?: boolean;
}

export function ElectionCard({ election, onVote, hasVoted = false }: ElectionCardProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const isActive = election.status === 'ACTIVE';
  const isCompleted = election.status === 'COMPLETED';
  const isUpcoming = election.status === 'UPCOMING';

  const getStatusColor = () => {
    switch (election.status) {
      case 'ACTIVE':
        return 'success';
      case 'COMPLETED':
        return 'default';
      case 'UPCOMING':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (election.status) {
      case 'ACTIVE':
        return 'Идет Голосование';
      case 'COMPLETED':
        return 'Завершено';
      case 'UPCOMING':
        return 'Предстоящие';
      case 'CANCELLED':
        return 'Отменено';
      default:
        return election.status;
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !onVote) return;

    setVoting(true);
    try {
      await onVote(election.id, selectedCandidate);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setVoting(false);
    }
  };

  const getTotalVotes = () => {
    return isCompleted
      ? election.totalVotes
      : election.candidates.reduce((sum, c) => sum + c.votes, 0);
  };

  const totalVotes = getTotalVotes();

  const getCandidatePercentage = (votes: number) => {
    return totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users size={20} />
              {election.organization.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {election.organization.type}
            </Typography>
          </Box>
          <Chip label={getStatusLabel()} color={getStatusColor()} />
        </Box>

        {/* Dates */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
            Начало: {new Date(election.startDate).toLocaleDateString('ru-RU')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Конец: {new Date(election.endDate).toLocaleDateString('ru-RU')}
          </Typography>
        </Box>

        {/* Winner (if completed) */}
        {isCompleted && election.winner && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle2 size={16} />
              Победитель
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {election.winner.firstName[0]}
                {election.winner.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {election.winner.firstName} {election.winner.lastName}
                </Typography>
                <Typography variant="caption">
                  {election.winnerVotes} голосов (
                  {getCandidatePercentage(election.winnerVotes || 0).toFixed(1)}%)
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Candidates */}
        <Typography variant="subtitle2" gutterBottom>
          Кандидаты ({election.candidates.length})
        </Typography>

        {isActive && !hasVoted ? (
          // Voting Mode
          <RadioGroup
            value={selectedCandidate}
            onChange={(e) => setSelectedCandidate(e.target.value)}
          >
            {election.candidates.map((candidate) => (
              <Box key={candidate.id} sx={{ mb: 2 }}>
                <FormControlLabel
                  value={candidate.candidate.id}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {candidate.candidate.firstName} {candidate.candidate.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{candidate.candidate.username}
                      </Typography>
                      {candidate.platform && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {candidate.platform}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </Box>
            ))}
          </RadioGroup>
        ) : (
          // Results Mode
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {election.candidates
              .sort((a, b) => b.votes - a.votes)
              .map((candidate) => {
                const percentage = getCandidatePercentage(candidate.votes);
                const isWinner = isCompleted && candidate.candidate.id === election.winner?.id;

                return (
                  <Box key={candidate.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={isWinner ? 'bold' : 'normal'}>
                        {candidate.candidate.firstName} {candidate.candidate.lastName}
                        {isWinner && ' 👑'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {candidate.votes} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      color={isWinner ? 'success' : 'primary'}
                    />
                  </Box>
                );
              })}
          </Box>
        )}

        {/* Stats */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />
            Всего голосов: {totalVotes}
            {isCompleted && election.turnoutRate && (
              <> • Явка: {election.turnoutRate.toFixed(1)}%</>
            )}
          </Typography>
        </Box>

        {/* Vote Button */}
        {isActive && !hasVoted && (
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleVote}
            disabled={!selectedCandidate || voting}
            startIcon={<Vote size={16} />}
          >
            {voting ? 'Голосование...' : 'Проголосовать'}
          </Button>
        )}

        {hasVoted && isActive && (
          <Chip
            label="Вы уже проголосовали"
            color="success"
            sx={{ mt: 2, width: '100%' }}
            icon={<CheckCircle2 size={14} />}
          />
        )}
      </CardContent>
    </Card>
  );
}
