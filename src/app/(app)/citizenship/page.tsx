'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Tabs, Tab, Alert, Card, CardContent,
  Chip, Button, Avatar, LinearProgress, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  getPendingAdmissions,
  voteOnAdmission,
  checkLegislativeEligibility,
  checkGovernmentEligibility,
  getExclusiveRightHistory,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Users, Shield, Landmark, ScrollText, ThumbsUp, ThumbsDown,
  Crown, MapPin, Clock, CheckCircle, XCircle, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

// ─── Types ───

interface Admission {
  id: string;
  applicantId: string;
  applicant?: { username: string; id: string };
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesRequired: number;
  createdAt: string;
}

interface RightTransfer {
  id: string;
  type: string;
  fromUserId?: string;
  toUserId?: string;
  fromUser?: { username: string };
  toUser?: { username: string };
  createdAt: string;
}

// ─── Component ───

export default function CitizenshipPage() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [rightHistory, setRightHistory] = useState<RightTransfer[]>([]);
  const [legislativeEligible, setLegislativeEligible] = useState<boolean | null>(null);
  const [governmentEligible, setGovernmentEligible] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.userId) return;
    setLoading(true);
    try {
      const [admData, legCheck, govCheck, history] = await Promise.all([
        getPendingAdmissions().catch(() => []),
        checkLegislativeEligibility(user.userId).catch(() => ({ eligible: false })),
        checkGovernmentEligibility(user.userId).catch(() => ({ eligible: false })),
        getExclusiveRightHistory(user.userId).catch(() => []),
      ]);
      setAdmissions(admData);
      setLegislativeEligible(legCheck.eligible);
      setGovernmentEligible(govCheck.eligible);
      setRightHistory(history);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (admissionId: string, vote: 'FOR' | 'AGAINST') => {
    if (!user?.userId) return;
    try {
      await voteOnAdmission(admissionId, { voterId: user.userId, vote });
      toast.success(vote === 'FOR' ? 'Голос «за» принят' : 'Голос «против» принят');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка голосования');
    }
  };

  const citizenType = (user as any)?.citizenType || 'RESIDENT';
  const hasExclusiveRight = (user as any)?.hasExclusiveLandRight || false;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Shield size={28} />
        Гражданство
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Управление гражданским статусом, исключительным земельным правом и допуском новых граждан
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ─── Status Card ─── */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{
              width: 56, height: 56,
              bgcolor: citizenType === 'INDIGENOUS' ? '#b45309' : citizenType === 'CITIZEN' ? '#1d4ed8' : '#6b7280',
            }}>
              {citizenType === 'INDIGENOUS' ? <Crown size={24} /> : <Users size={24} />}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: '#f5f5f5' }}>
                {(user as any)?.username || user?.address?.slice(0, 10) || 'Пользователь'}
              </Typography>
              <Chip
                label={
                  citizenType === 'INDIGENOUS' ? 'Коренной (Indigenous)' :
                  citizenType === 'CITIZEN' ? 'Гражданин (Citizen)' :
                  'Житель (Resident)'
                }
                size="small"
                sx={{
                  bgcolor: citizenType === 'INDIGENOUS' ? 'rgba(180,83,9,0.3)' : citizenType === 'CITIZEN' ? 'rgba(29,78,216,0.3)' : 'rgba(107,114,128,0.3)',
                  color: citizenType === 'INDIGENOUS' ? '#fbbf24' : citizenType === 'CITIZEN' ? '#60a5fa' : '#9ca3af',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(245,158,11,0.1)' }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            {/* Exclusive Land Right */}
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <MapPin size={20} style={{ margin: '0 auto 4px', color: hasExclusiveRight ? '#22c55e' : '#6b7280' }} />
              <Typography variant="caption" display="block" sx={{ color: '#9ca3af' }}>
                Исключительное земельное право
              </Typography>
              <Chip
                icon={hasExclusiveRight ? <CheckCircle size={14} /> : <XCircle size={14} />}
                label={hasExclusiveRight ? 'Есть' : 'Нет'}
                size="small"
                color={hasExclusiveRight ? 'success' : 'default'}
                sx={{ mt: 0.5 }}
              />
            </Box>

            {/* Legislative Eligibility */}
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Landmark size={20} style={{ margin: '0 auto 4px', color: legislativeEligible ? '#22c55e' : '#6b7280' }} />
              <Typography variant="caption" display="block" sx={{ color: '#9ca3af' }}>
                Законодательная ветвь (Хурал)
              </Typography>
              <Chip
                icon={legislativeEligible ? <CheckCircle size={14} /> : <XCircle size={14} />}
                label={legislativeEligible ? 'Допущен' : 'Не допущен'}
                size="small"
                color={legislativeEligible ? 'success' : 'default'}
                sx={{ mt: 0.5 }}
              />
            </Box>

            {/* Government Eligibility */}
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Shield size={20} style={{ margin: '0 auto 4px', color: governmentEligible ? '#22c55e' : '#6b7280' }} />
              <Typography variant="caption" display="block" sx={{ color: '#9ca3af' }}>
                Исполнительная / Судебная
              </Typography>
              <Chip
                icon={governmentEligible ? <CheckCircle size={14} /> : <XCircle size={14} />}
                label={governmentEligible ? 'Допущен' : 'Не допущен'}
                size="small"
                color={governmentEligible ? 'success' : 'default'}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ─── Tabs ─── */}
      <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={18} />
            Допуск граждан ({admissions.length})
          </Box>
        } />
        <Tab label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScrollText size={18} />
            История права ({rightHistory.length})
          </Box>
        } />
      </Tabs>

      {/* ─── Tab 0: Admission Voting ─── */}
      {currentTab === 0 && (
        <Box>
          {citizenType !== 'INDIGENOUS' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Только коренные (INDIGENOUS) могут голосовать за приём новых граждан.
            </Alert>
          )}

          {admissions.length === 0 ? (
            <Alert severity="info">Нет ожидающих заявок на гражданство</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {admissions.map((admission) => (
                <Card key={admission.id} sx={{ border: '1px solid rgba(245,158,11,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {admission.applicant?.username || admission.applicantId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          {new Date(admission.createdAt).toLocaleDateString('ru-RU')}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={`За: ${admission.votesFor}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                        <Chip
                          label={`Против: ${admission.votesAgainst}`}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                        <Chip
                          label={`Нужно: ${admission.votesRequired}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>

                    {/* Progress bar */}
                    <LinearProgress
                      variant="determinate"
                      value={admission.votesRequired > 0 ? (admission.votesFor / admission.votesRequired) * 100 : 0}
                      sx={{ mt: 2, mb: 1, height: 6, borderRadius: 3 }}
                      color="success"
                    />

                    {/* Vote buttons (only for INDIGENOUS) */}
                    {citizenType === 'INDIGENOUS' && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                        <Tooltip title="Голосовать за принятие">
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<ThumbsUp size={16} />}
                            onClick={() => handleVote(admission.id, 'FOR')}
                          >
                            За
                          </Button>
                        </Tooltip>
                        <Tooltip title="Голосовать против принятия">
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<ThumbsDown size={16} />}
                            onClick={() => handleVote(admission.id, 'AGAINST')}
                          >
                            Против
                          </Button>
                        </Tooltip>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ─── Tab 1: Right Transfer History ─── */}
      {currentTab === 1 && (
        <Box>
          {rightHistory.length === 0 ? (
            <Alert severity="info">Нет записей о передаче исключительного права</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {rightHistory.map((transfer) => (
                <Card key={transfer.id} sx={{ border: '1px solid rgba(245,158,11,0.05)' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={
                          transfer.type === 'INITIAL_GRANT' ? 'Выдача' :
                          transfer.type === 'INHERITANCE' ? 'Наследование' :
                          transfer.type === 'REVERTED_TO_FUND' ? 'Возврат в фонд' :
                          transfer.type
                        }
                        size="small"
                        color={
                          transfer.type === 'INITIAL_GRANT' ? 'primary' :
                          transfer.type === 'INHERITANCE' ? 'success' :
                          'warning'
                        }
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          {transfer.fromUser?.username || '—'}
                          <ArrowRight size={14} style={{ verticalAlign: 'middle', margin: '0 8px' }} />
                          {transfer.toUser?.username || 'Земельный фонд'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(transfer.createdAt).toLocaleDateString('ru-RU')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}
