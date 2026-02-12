'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Users,
  Award,
  TrendingUp,
  Star,
  DollarSign,
  Heart,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { RateOrganizationDialog, RatingData } from '@/components/organizations/RateOrganizationDialog';

interface OrganizationDetail {
  id: string;
  name: string;
  type: string;
  branch?: string;
  description?: string;
  leader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  parent?: {
    id: string;
    name: string;
  };
  children: Array<{
    id: string;
    name: string;
  }>;
  members: Array<{
    id: string;
    user: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
    };
    role: string;
    joinedAt: Date;
  }>;
  trustScore: number;
  qualityScore: number;
  financialScore: number;
  overallRating: number;
  currentRank?: number;
  previousRank?: number;
  contractsCompleted: number;
  contractsActive: number;
  totalRevenue: number;
  createdAt: Date;
}

export default function OrganizationProfilePage() {
  const params = useParams();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchOrganization();
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch organization');

      const data = await response.json();
      setOrganization(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (ratings: RatingData) => {
    if (!organization) return;

    try {
      const response = await fetch(`/api/organizations/${organization.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(ratings),
      });

      if (!response.ok) throw new Error('Failed to submit rating');

      // Refresh organization
      await fetchOrganization();
    } catch (err: any) {
      throw err;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success.main';
    if (score >= 6) return 'warning.main';
    return 'error.main';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (error || !organization) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Organization not found'}</Alert>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Users size={32} />
                {organization.name}
                {organization.currentRank && organization.currentRank <= 100 && (
                  <Chip
                    label={`#${organization.currentRank}`}
                    color="primary"
                    icon={<Award size={14} />}
                  />
                )}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {organization.type}
                {organization.branch && ` • ${organization.branch}`}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Star size={20} />}
              onClick={() => setRatingDialogOpen(true)}
            >
              Оценить
            </Button>
          </Box>

          {organization.description && (
            <Typography variant="body1" color="text.secondary">
              {organization.description}
            </Typography>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Общий Рейтинг
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Star size={24} color="#FFD700" fill="#FFD700" />
                  <Typography variant="h3" color="primary">
                    {organization.overallRating.toFixed(1)}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    / 10
                  </Typography>
                </Box>

                {/* Individual Scores */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        <DollarSign size={16} style={{ display: 'inline', marginRight: 4 }} />
                        Финансы
                      </Typography>
                      <Typography variant="body2" color={getScoreColor(organization.financialScore)}>
                        {organization.financialScore.toFixed(1)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={organization.financialScore * 10}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getScoreColor(organization.financialScore),
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        <Heart size={16} style={{ display: 'inline', marginRight: 4 }} />
                        Доверие
                      </Typography>
                      <Typography variant="body2" color={getScoreColor(organization.trustScore)}>
                        {organization.trustScore.toFixed(1)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={organization.trustScore * 10}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getScoreColor(organization.trustScore),
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        <Award size={16} style={{ display: 'inline', marginRight: 4 }} />
                        Качество
                      </Typography>
                      <Typography variant="body2" color={getScoreColor(organization.qualityScore)}>
                        {organization.qualityScore.toFixed(1)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={organization.qualityScore * 10}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getScoreColor(organization.qualityScore),
                        },
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Статистика
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Контракты Завершены
                    </Typography>
                    <Typography variant="h5">
                      <CheckCircle size={20} style={{ display: 'inline', marginRight: 4 }} />
                      {organization.contractsCompleted}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Активные Контракты
                    </Typography>
                    <Typography variant="h5">{organization.contractsActive}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Общая Выручка
                    </Typography>
                    <Typography variant="h5">{organization.totalRevenue.toLocaleString()} ₮</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Участников
                    </Typography>
                    <Typography variant="h5">{organization.members.length}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Информация
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Лидер
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {organization.leader.firstName[0]}
                        {organization.leader.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {organization.leader.firstName} {organization.leader.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{organization.leader.username}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {organization.parent && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Родительская Организация
                      </Typography>
                      <Typography variant="body2">
                        <a href={`/organizations/${organization.parent.id}`}>
                          {organization.parent.name}
                        </a>
                      </Typography>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Создано
                    </Typography>
                    <Typography variant="body2">
                      {new Date(organization.createdAt).toLocaleDateString('ru-RU')}
                    </Typography>
                  </Box>

                  {organization.children.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Дочерние Организации
                      </Typography>
                      <Typography variant="body2">{organization.children.length}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Members Table */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Участники ({organization.members.length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Пользователь</TableCell>
                        <TableCell>Роль</TableCell>
                        <TableCell>Дата вступления</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {organization.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {member.user.firstName[0]}
                                {member.user.lastName[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">
                                  {member.user.firstName} {member.user.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{member.user.username}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={member.role}
                              size="small"
                              color={member.role === 'LEADER' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Rating Dialog */}
      <RateOrganizationDialog
        open={ratingDialogOpen}
        onClose={() => setRatingDialogOpen(false)}
        organizationName={organization.name}
        organizationId={organization.id}
        onSubmit={handleSubmitRating}
      />
    </>
  );
}
