'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  Users,
  Award,
  Star,
  DollarSign,
  Heart,
  CheckCircle,
  Shield,
  Settings,
  Vote,
  FileText,
  BarChart3,
  Building2,
  GitBranch,
  Crown,
  UserPlus,
  UserMinus,
  ChevronRight,
} from 'lucide-react';

// ========================
// Types
// ========================

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    seatId: string;
    username: string;
    role: string;
    verificationLevel?: string;
    reputationProfile?: { score: number };
  };
}

interface OrgPermissions {
  id: string;
  role: string;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canCreateTasks: boolean;
  canAssignTasks: boolean;
  canVote: boolean;
  canCreateProposal: boolean;
  canManageTreasury: boolean;
  canSignDocuments: boolean;
  canCallElection: boolean;
  canEditOrgInfo: boolean;
  canViewReports: boolean;
  canCreateReports: boolean;
  canManageRoles: boolean;
  canArchive: boolean;
}

interface OrgDashboardData {
  id: string;
  name: string;
  type: string;
  branch?: string;
  description?: string;
  level: number;
  leaderId: string;
  leader: { id: string; seatId: string; username: string; role: string };
  parent?: { id: string; name: string; type: string };
  children: Array<{ id: string; name: string; type: string; overallRating: number; members: { id: string }[] }>;
  members: OrgMember[];
  permissions: OrgPermissions[];
  ratings: Array<{
    id: string;
    category: string;
    score: number;
    comment?: string;
    createdAt: string;
    rater: { id: string; seatId: string; username: string };
  }>;
  achievements: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    awardedAt: string;
  }>;
  elections: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    candidates: Array<{ candidate: { id: string; seatId: string; username: string } }>;
  }>;
  trustScore: number;
  qualityScore: number;
  financialScore: number;
  overallRating: number;
  currentRank?: number;
  totalRevenue: number;
  contractsCompleted: number;
  contractsActive: number;
  maxMembers: number;
  roleDistribution: Record<string, number>;
  memberCount: number;
  childCount: number;
  isFull: boolean;
  createdAt: string;
}

// ========================
// Role Configuration
// ========================

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string; order: number }> = {
  LEADER: { label: 'Глава', color: '#FFD700', icon: '👑', order: 0 },
  DEPUTY: { label: 'Заместитель', color: '#C0C0C0', icon: '🛡️', order: 1 },
  TREASURER: { label: 'Казначей', color: '#4CAF50', icon: '💰', order: 2 },
  SECRETARY: { label: 'Секретарь', color: '#2196F3', icon: '📋', order: 3 },
  OFFICER: { label: 'Должностное лицо', color: '#9C27B0', icon: '⚔️', order: 4 },
  MEMBER: { label: 'Участник', color: '#757575', icon: '👤', order: 5 },
  APPRENTICE: { label: 'Стажёр', color: '#FF9800', icon: '📚', order: 6 },
};

const PERMISSION_LABELS: Record<string, string> = {
  canInviteMembers: 'Приглашать участников',
  canRemoveMembers: 'Исключать участников',
  canCreateTasks: 'Создавать задачи',
  canAssignTasks: 'Назначать задачи',
  canVote: 'Голосовать',
  canCreateProposal: 'Вносить предложения',
  canManageTreasury: 'Управлять казной',
  canSignDocuments: 'Подписывать документы',
  canCallElection: 'Назначать выборы',
  canEditOrgInfo: 'Редактировать информацию',
  canViewReports: 'Просматривать отчёты',
  canCreateReports: 'Создавать отчёты',
  canManageRoles: 'Управлять ролями',
  canArchive: 'Архивировать',
};

// ========================
// Component
// ========================

export default function UnifiedOrgDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [data, setData] = useState<OrgDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/org/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch organization');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    if (orgId) fetchDashboard();
  }, [orgId, fetchDashboard]);

  const handleInvite = async () => {
    try {
      const res = await fetch(`/api/org/${orgId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: inviteUserId, role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add member');
      }
      setInviteOpen(false);
      setInviteUserId('');
      setToast({ open: true, message: 'Участник добавлен', severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) return;
    try {
      const res = await fetch(`/api/org/${orgId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed');
      }
      setToast({ open: true, message: 'Участник удалён', severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/org/${orgId}/members/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed');
      }
      setToast({ open: true, message: 'Роль обновлена', severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setToast({ open: true, message: err.message, severity: 'error' });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#4CAF50';
    if (score >= 6) return '#FF9800';
    return '#f44336';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GUILD: '🛡️ Гильдия',
      COMMITTEE: '📋 Комитет',
      SERVICE: '🏛️ Государственный сервис',
      ARBAN: '⚔️ Арбан (10)',
      HUNDRED: '🏘️ Зүн (100)',
      THOUSAND: '🏙️ Мянган (1000)',
      REPUBLIC: '🏛️ Республика',
      CONFEDERATION: '🌍 Конфедерация',
    };
    return labels[type] || type;
  };

  const getBranchLabel = (branch?: string) => {
    const labels: Record<string, string> = {
      LEGISLATIVE: '📜 Законодательная',
      EXECUTIVE: '🏢 Исполнительная',
      JUSTICE: '⚖️ Судебная',
      BANKING: '🏦 Банковская',
      CIVIL_SERVICE: '🏛️ Гражданская служба',
    };
    return branch ? labels[branch] || branch : null;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          Загрузка организации...
        </Typography>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Организация не найдена'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* ==================== HEADER ==================== */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4" fontWeight="bold">
                {data.name}
              </Typography>
              {data.currentRank && data.currentRank <= 100 && (
                <Chip
                  label={`#${data.currentRank}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,215,0,0.2)', color: '#FFD700', fontWeight: 'bold' }}
                  icon={<Award size={14} color="#FFD700" />}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={getTypeLabel(data.type)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
              {getBranchLabel(data.branch) && (
                <Chip label={getBranchLabel(data.branch)!} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
              )}
              <Chip
                label={`${data.memberCount}/${data.maxMembers} участников`}
                size="small"
                sx={{ bgcolor: data.isFull ? 'rgba(244,67,54,0.3)' : 'rgba(76,175,80,0.3)', color: 'white' }}
                icon={<Users size={14} color="white" />}
              />
            </Box>
            {data.description && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                {data.description}
              </Typography>
            )}
          </Box>

          {/* Rating Circle */}
          <Box sx={{ textAlign: 'center', minWidth: 100 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                border: `4px solid ${getScoreColor(data.overallRating)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                {data.overallRating.toFixed(1)}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Общий рейтинг
            </Typography>
          </Box>
        </Box>

        {/* Sub-ratings */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[
            { label: 'Доверие', score: data.trustScore, icon: '❤️' },
            { label: 'Качество', score: data.qualityScore, icon: '⭐' },
            { label: 'Финансы', score: data.financialScore, icon: '💰' },
          ].map((item) => (
            <Grid size={{ xs: 4 }} key={item.label}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{item.icon}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">{item.label}</Typography>
                    <Typography variant="caption" fontWeight="bold" color={getScoreColor(item.score)}>
                      {item.score.toFixed(1)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.score * 10}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(item.score) },
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ==================== NAVIGATION TABS ==================== */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { minHeight: 56 } }}
        >
          <Tab label="📊 Обзор" />
          <Tab label="👥 Команда" />
          <Tab label="🛡️ Полномочия" />
          <Tab label="🏆 Достижения" />
          <Tab label="🏗️ Структура" />
        </Tabs>
      </Paper>

      {/* ==================== TAB: OVERVIEW ==================== */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Stats */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Статистика
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {[
                  { label: 'Контрактов завершено', value: data.contractsCompleted, icon: <CheckCircle size={18} /> },
                  { label: 'Активные контракты', value: data.contractsActive, icon: <FileText size={18} /> },
                  { label: 'Общая выручка', value: `${data.totalRevenue.toLocaleString()} ₮`, icon: <DollarSign size={18} /> },
                  { label: 'Участников', value: `${data.memberCount}/${data.maxMembers}`, icon: <Users size={18} /> },
                  { label: 'Подразделений', value: data.childCount, icon: <Building2 size={18} /> },
                ].map((stat) => (
                  <Box key={stat.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {stat.icon}
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {stat.value}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Leader & Info */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  👑 Руководство
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#FFD700', width: 48, height: 48 }}>
                    {data.leader.username?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {data.leader.username || data.leader.seatId}
                    </Typography>
                    <Chip label="Глава" size="small" sx={{ bgcolor: '#FFD700', color: '#000' }} />
                  </Box>
                </Box>

                {/* Role Distribution */}
                <Typography variant="body2" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>
                  Распределение ролей:
                </Typography>
                {Object.entries(data.roleDistribution ?? {}).map(([role, count]) => (
                  <Box key={role} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">
                      {ROLE_CONFIG[role]?.icon} {ROLE_CONFIG[role]?.label || role}
                    </Typography>
                    <Chip label={count} size="small" variant="outlined" />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Ratings */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ⭐ Последние оценки
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {data.ratings.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Пока нет оценок
                  </Typography>
                ) : (
                  data.ratings.slice(0, 5).map((r) => (
                    <Box key={r.id} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">{r.category}</Typography>
                        <Chip
                          label={r.score.toFixed(1)}
                          size="small"
                          sx={{ bgcolor: getScoreColor(r.score) + '20', color: getScoreColor(r.score) }}
                        />
                      </Box>
                      {r.comment && (
                        <Typography variant="caption" color="text.secondary">
                          "{r.comment}"
                        </Typography>
                      )}
                      <Typography variant="caption" display="block" color="text.secondary">
                        — @{r.rater.username} • {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                      </Typography>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Hierarchy path */}
          {data.parent && (
            <Grid size={12}>
              <Alert
                severity="info"
                icon={<GitBranch size={20} />}
                action={
                  <Button size="small" onClick={() => router.push(`/org/${data.parent!.id}`)}>
                    Перейти
                  </Button>
                }
              >
                Родительская организация: <strong>{data.parent.name}</strong> ({data.parent.type})
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* ==================== TAB: TEAM ==================== */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                👥 Команда ({data.memberCount}/{data.maxMembers})
              </Typography>
              <Button
                variant="contained"
                startIcon={<UserPlus size={18} />}
                onClick={() => setInviteOpen(true)}
                disabled={data.isFull}
              >
                Пригласить
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Участник</TableCell>
                    <TableCell>Роль</TableCell>
                    <TableCell>Верификация</TableCell>
                    <TableCell>Дата вступления</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.members
                    .sort((a, b) => (ROLE_CONFIG[a.role]?.order ?? 99) - (ROLE_CONFIG[b.role]?.order ?? 99))
                    .map((member) => (
                      <TableRow key={member.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: ROLE_CONFIG[member.role]?.color || '#757575',
                                fontSize: 14,
                              }}
                            >
                              {ROLE_CONFIG[member.role]?.icon || '👤'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {member.user.username || member.user.seatId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Seat: {member.user.seatId.slice(0, 8)}...
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                              disabled={member.role === 'LEADER'}
                              size="small"
                            >
                              {Object.entries(ROLE_CONFIG)
                                .filter(([key]) => key !== 'LEADER')
                                .map(([key, cfg]) => (
                                  <MenuItem key={key} value={key}>
                                    {cfg.icon} {cfg.label}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.user.verificationLevel || 'NONE'}
                            size="small"
                            color={member.user.verificationLevel === 'VERIFIED' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                        </TableCell>
                        <TableCell align="right">
                          {member.role !== 'LEADER' && (
                            <Tooltip title="Удалить участника">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                <UserMinus size={18} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB: PERMISSIONS ==================== */}
      {activeTab === 2 && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🛡️ Матрица Полномочий
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Каждая роль имеет определённый набор разрешений в организации
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Полномочие</TableCell>
                    {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                      <TableCell key={role} align="center" sx={{ fontWeight: 'bold', fontSize: 12 }}>
                        {cfg.icon}<br />{cfg.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                    <TableRow key={perm} hover>
                      <TableCell>{label}</TableCell>
                      {Object.keys(ROLE_CONFIG).map((role) => {
                        const rolePerms = data.permissions.find((p) => p.role === role);
                        const hasPermission = rolePerms ? (rolePerms as any)[perm] : false;
                        return (
                          <TableCell key={role} align="center">
                            {hasPermission ? (
                              <CheckCircle size={18} color="#4CAF50" />
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ==================== TAB: ACHIEVEMENTS ==================== */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {data.achievements.length === 0 ? (
            <Grid size={12}>
              <Alert severity="info">Организация пока не получила достижений</Alert>
            </Grid>
          ) : (
            data.achievements.map((ach) => (
              <Grid size={{ xs: 12, md: 4 }} key={ach.id}>
                <Card sx={{ borderRadius: 2, textAlign: 'center', py: 2 }}>
                  <CardContent>
                    <Typography variant="h3" sx={{ mb: 1 }}>
                      🏆
                    </Typography>
                    <Typography variant="h6">{ach.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ach.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {new Date(ach.awardedAt).toLocaleDateString('ru-RU')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}

          {/* Elections */}
          <Grid size={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🗳️ Выборы
                </Typography>
                {data.elections.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    История выборов пуста
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Статус</TableCell>
                        <TableCell>Начало</TableCell>
                        <TableCell>Окончание</TableCell>
                        <TableCell>Кандидатов</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.elections.map((el) => (
                        <TableRow key={el.id}>
                          <TableCell>
                            <Chip label={el.status} size="small" color={el.status === 'COMPLETED' ? 'success' : 'warning'} />
                          </TableCell>
                          <TableCell>{new Date(el.startDate).toLocaleDateString('ru-RU')}</TableCell>
                          <TableCell>{new Date(el.endDate).toLocaleDateString('ru-RU')}</TableCell>
                          <TableCell>{el.candidates.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ==================== TAB: STRUCTURE ==================== */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          {data.parent && (
            <Grid size={12}>
              <Card
                sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => router.push(`/org/${data.parent!.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5">⬆️</Typography>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Родительская организация
                      </Typography>
                      <Typography variant="h6">{data.parent.name}</Typography>
                      <Chip label={data.parent.type} size="small" />
                    </Box>
                    <ChevronRight size={24} style={{ marginLeft: 'auto' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid size={12}>
            <Card sx={{ borderRadius: 2, border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h5">🏛️</Typography>
                  <Box>
                    <Typography variant="caption" color="primary">
                      ← ВЫ ЗДЕСЬ
                    </Typography>
                    <Typography variant="h6">{data.name}</Typography>
                    <Chip label={getTypeLabel(data.type)} size="small" color="primary" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {data.children.length > 0 && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                ⬇️ Подразделения ({data.childCount})
              </Typography>
              <Grid container spacing={2}>
                {data.children.map((child) => (
                  <Grid size={{ xs: 12, md: 4 }} key={child.id}>
                    <Card
                      sx={{ borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => router.push(`/org/${child.id}`)}
                    >
                      <CardContent>
                        <Typography variant="body1" fontWeight="bold">
                          {child.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip label={child.type} size="small" />
                          <Chip
                            label={`⭐ ${child.overallRating?.toFixed(1) || '—'}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`👥 ${child.members?.length || 0}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}

          {data.children.length === 0 && (
            <Grid size={12}>
              <Alert severity="info">
                У этой организации пока нет подразделений.
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* ==================== INVITE DIALOG ==================== */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Пригласить участника</DialogTitle>
        <DialogContent>
          <TextField
            label="User ID"
            fullWidth
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Роль</InputLabel>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} label="Роль">
              {Object.entries(ROLE_CONFIG)
                .filter(([k]) => k !== 'LEADER')
                .map(([key, cfg]) => (
                  <MenuItem key={key} value={key}>
                    {cfg.icon} {cfg.label}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleInvite} disabled={!inviteUserId}>
            Пригласить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
