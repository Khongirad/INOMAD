'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  Button,
  LinearProgress,
} from '@mui/material';
import { Users, TrendingUp, Award, Star } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  type: 'GUILD' | 'ARBAN' | 'HUNDRED' | 'THOUSAND' | 'TUMEN' | 'ARAD' | 'CONFEDERATION';
  branch?: string;
  description?: string;
  leader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  members: number;
  trustScore: number;
  qualityScore: number;
  financialScore: number;
  overallRating: number;
  currentRank?: number;
  previousRank?: number;
  contractsCompleted: number;
}

interface OrganizationCardProps {
  organization: Organization;
  onRate?: (id: string) => void;
  showRank?: boolean;
}

export function OrganizationCard({ organization, onRate, showRank = false }: OrganizationCardProps) {
  const getRankChange = () => {
    if (!organization.currentRank || !organization.previousRank) return null;
    const change = organization.previousRank - organization.currentRank;
    return change;
  };

  const rankChange = getRankChange();

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success.main';
    if (score >= 6) return 'warning.main';
    return 'error.main';
  };

  return (
    <Card>
      <CardContent>
        {/* Header with Rank */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users size={20} />
              {organization.name}
              {showRank && organization.currentRank && organization.currentRank <= 100 && (
                <Chip
                  label={`#${organization.currentRank}`}
                  color="primary"
                  size="small"
                  icon={<Award size={14} />}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {organization.type}
              {organization.branch && ` • ${organization.branch}`}
            </Typography>
          </Box>

          {/* Rank Change Indicator */}
          {showRank && rankChange !== null && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="caption"
                color={rankChange > 0 ? 'success.main' : rankChange < 0 ? 'error.main' : 'text.secondary'}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '→'}
                {Math.abs(rankChange)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Description */}
        {organization.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {organization.description}
          </Typography>
        )}

        {/* Leader & Members */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Лидер
            </Typography>
            <Typography variant="body2">
              {organization.leader.firstName} {organization.leader.lastName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Участников
            </Typography>
            <Typography variant="body2">{organization.members}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Контракты
            </Typography>
            <Typography variant="body2">{organization.contractsCompleted}</Typography>
          </Box>
        </Box>

        {/* Rating Scores */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Рейтинг
          </Typography>

          {/* Overall Rating */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Star size={16} color="#FFD700" fill="#FFD700" />
            <Typography variant="h6" color="primary">
              {organization.overallRating.toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              / 10
            </Typography>
          </Box>

          {/* Individual Scores */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Financial Score */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">Финансовый</Typography>
                <Typography variant="caption" color={getScoreColor(organization.financialScore)}>
                  {organization.financialScore.toFixed(1)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={organization.financialScore * 10}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(organization.financialScore),
                  },
                }}
              />
            </Box>

            {/* Trust Score */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">Доверие</Typography>
                <Typography variant="caption" color={getScoreColor(organization.trustScore)}>
                  {organization.trustScore.toFixed(1)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={organization.trustScore * 10}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(organization.trustScore),
                  },
                }}
              />
            </Box>

            {/* Quality Score */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">Качество</Typography>
                <Typography variant="caption" color={getScoreColor(organization.qualityScore)}>
                  {organization.qualityScore.toFixed(1)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={organization.qualityScore * 10}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(organization.qualityScore),
                  },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" fullWidth href={`/organizations/${organization.id}`}>
            Профиль
          </Button>
          {onRate && (
            <Button variant="contained" fullWidth onClick={() => onRate(organization.id)}>
              Оценить
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
