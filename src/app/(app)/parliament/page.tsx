'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Tabs,
  Tab,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Landmark,
  Vote,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  MinusCircle,
  Play,
  Square,
  Plus,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#2196F3',
  IN_PROGRESS: '#FF9800',
  COMPLETED: '#4CAF50',
  CANCELLED: '#F44336',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Запланирована',
  IN_PROGRESS: 'Идёт',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

export default function ParliamentPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [tab, setTab] = useState(0);
  const [createDialog, setCreateDialog] = useState(false);
  const [voteDialog, setVoteDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    level: 'REPUBLICAN',
    entityId: '',
    title: '',
    description: '',
    agenda: '',
    sessionDate: '',
    quorumRequired: 1,
  });
  const [voteForm, setVoteForm] = useState({ vote: 'FOR' as string, comment: '' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parliament/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (sessionId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/parliament/sessions/${sessionId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data);
      setSelectedSession(data.session);
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parliament/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setCreateDialog(false);
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const handleAction = async (sessionId: string, action: 'start' | 'complete') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/parliament/sessions/${sessionId}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      fetchSessions();
    } catch (err) {
      console.error(`Failed to ${action} session`, err);
    }
  };

  const handleVote = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/parliament/sessions/${sessionId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(voteForm),
      });
      setVoteDialog(false);
      fetchResults(sessionId);
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  const scheduled = sessions.filter(s => s.status === 'SCHEDULED');
  const inProgress = sessions.filter(s => s.status === 'IN_PROGRESS');
  const completed = sessions.filter(s => s.status === 'COMPLETED');

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Landmark size={28} color="#FFB800" />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
              Парламент / Parliament
            </Typography>
            <Typography variant="body2" sx={{ color: '#888' }}>
              Хурал — сессии и голосование лидеров Тумэнов
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setCreateDialog(true)}
          sx={{ bgcolor: '#2196F3' }}
        >
          Созвать сессию
        </Button>
      </Box>

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #333', flex: 1, minWidth: 140 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: '#888' }}>Запланировано</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196F3' }}>{scheduled.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #333', flex: 1, minWidth: 140 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: '#888' }}>Идут сейчас</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>{inProgress.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #333', flex: 1, minWidth: 140 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: '#888' }}>Завершено</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>{completed.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #333', flex: 1, minWidth: 140 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: '#888' }}>Всего</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff' }}>{sessions.length}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Alert severity="info" sx={{ mb: 2, bgcolor: '#1a1a2e' }}>
        <strong>Только лидеры Тумэнов</strong> имеют право голоса в Хурале.
        В Республиканском Хурале голосуют лидеры Тумэнов данной Республики.
      </Alert>

      {/* Sessions list */}
      {sessions.length === 0 && !loading && (
        <Alert severity="info" sx={{ bgcolor: '#1a1a2e' }}>
          Нет запланированных сессий. Созовите первую сессию Хурала!
        </Alert>
      )}

      {sessions.map((session: any) => (
        <Card
          key={session.id}
          sx={{
            bgcolor: '#1a1a2e',
            border: `1px solid ${selectedSession?.id === session.id ? '#FFB800' : '#333'}`,
            mb: 2,
            cursor: 'pointer',
            '&:hover': { borderColor: '#555' },
          }}
          onClick={() => fetchResults(session.id)}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={session.level === 'REPUBLICAN' ? 'Республика' : 'Конфедерация'}
                size="small"
                sx={{
                  bgcolor: session.level === 'REPUBLICAN' ? '#2196F3' : '#FFB800',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', flex: 1 }}>
                {session.title}
              </Typography>
              <Chip
                label={STATUS_LABELS[session.status] || session.status}
                size="small"
                sx={{
                  bgcolor: STATUS_COLORS[session.status],
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#888' }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Calendar size={14} />
                <Typography variant="caption">
                  {new Date(session.sessionDate).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Vote size={14} />
                <Typography variant="caption">
                  {session._count?.votes || 0} голосов
                </Typography>
              </Stack>
              {session.convenedBy && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Users size={14} />
                  <Typography variant="caption">
                    Созвал: {session.convenedBy.username}
                  </Typography>
                </Stack>
              )}
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              {session.status === 'SCHEDULED' && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Play size={14} />}
                  onClick={(e) => { e.stopPropagation(); handleAction(session.id, 'start'); }}
                  sx={{ bgcolor: '#FF9800', fontSize: '0.75rem' }}
                >
                  Начать
                </Button>
              )}
              {session.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Vote size={14} />}
                    onClick={(e) => { e.stopPropagation(); setSelectedSession(session); setVoteDialog(true); }}
                    sx={{ bgcolor: '#4CAF50', fontSize: '0.75rem' }}
                  >
                    Голосовать
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Square size={14} />}
                    onClick={(e) => { e.stopPropagation(); handleAction(session.id, 'complete'); }}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Завершить
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Results panel */}
      {results && (
        <Card sx={{ bgcolor: '#0d1117', border: '1px solid #FFB800', mt: 3, p: 2 }}>
          <Typography variant="h6" sx={{ color: '#FFB800', mb: 2 }}>
            📊 Результаты: {results.session?.title}
          </Typography>

          <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <CheckCircle size={24} color="#4CAF50" />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                {results.results?.for || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>За</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <XCircle size={24} color="#F44336" />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#F44336' }}>
                {results.results?.against || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>Против</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <MinusCircle size={24} color="#FF9800" />
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800' }}>
                {results.results?.abstain || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>Воздержался</Typography>
            </Box>
          </Stack>

          <Chip
            label={results.results?.passed ? '✅ ПРИНЯТО' : '❌ НЕ ПРИНЯТО'}
            sx={{
              bgcolor: results.results?.passed ? '#1b5e20' : '#b71c1c',
              color: '#fff',
              fontWeight: 700,
              mb: 2,
            }}
          />

          {results.session?.resolution && (
            <Alert severity="success" sx={{ mt: 1, bgcolor: '#1a1a2e' }}>
              <strong>Резолюция:</strong> {results.session.resolution}
            </Alert>
          )}

          <Divider sx={{ my: 2, borderColor: '#333' }} />

          <Typography variant="subtitle2" sx={{ color: '#888', mb: 1 }}>
            Голоса ({results.votes?.length || 0})
          </Typography>
          {results.votes?.map((v: any) => (
            <Box
              key={v.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 0.5,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.03)',
                mb: 0.5,
              }}
            >
              {v.vote === 'FOR' && <CheckCircle size={14} color="#4CAF50" />}
              {v.vote === 'AGAINST' && <XCircle size={14} color="#F44336" />}
              {v.vote === 'ABSTAIN' && <MinusCircle size={14} color="#FF9800" />}
              <Typography variant="body2" sx={{ color: '#fff' }}>
                {v.voter?.username} ({v.tumen?.name})
              </Typography>
              {v.comment && (
                <Typography variant="caption" sx={{ color: '#888', ml: 'auto' }}>
                  "{v.comment}"
                </Typography>
              )}
            </Box>
          ))}
        </Card>
      )}

      {/* Create Session Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff' } }}
      >
        <DialogTitle>Созвать сессию Хурала</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel sx={{ color: '#888' }}>Уровень</InputLabel>
            <Select
              value={createForm.level}
              onChange={e => setCreateForm({ ...createForm, level: e.target.value })}
              label="Уровень"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="REPUBLICAN">Республиканский Хурал</MenuItem>
              <MenuItem value="CONFEDERATIVE">Конфедеративный Хурал</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth label="ID Республики/Конфедерации"
            value={createForm.entityId}
            onChange={e => setCreateForm({ ...createForm, entityId: e.target.value })}
            sx={{ mb: 2 }} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#888' } }}
          />
          <TextField
            fullWidth label="Тема сессии"
            value={createForm.title}
            onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
            sx={{ mb: 2 }} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#888' } }}
          />
          <TextField
            fullWidth multiline rows={2} label="Описание"
            value={createForm.description}
            onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
            sx={{ mb: 2 }} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#888' } }}
          />
          <TextField
            fullWidth label="Дата и время" type="datetime-local"
            value={createForm.sessionDate}
            onChange={e => setCreateForm({ ...createForm, sessionDate: e.target.value })}
            sx={{ mb: 2 }} InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#888' }, shrink: true }}
          />
          <TextField
            fullWidth label="Кворум (мин. голосов)" type="number"
            value={createForm.quorumRequired}
            onChange={e => setCreateForm({ ...createForm, quorumRequired: parseInt(e.target.value) || 1 })}
            InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#888' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: '#2196F3' }}>
            Созвать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialog} onClose={() => setVoteDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff' } }}
      >
        <DialogTitle>Голосование</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, bgcolor: '#0d1117' }}>
            Вы голосуете как лидер Тумэна. Один голос на сессию.
          </Alert>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#888' }}>Ваш голос</InputLabel>
            <Select
              value={voteForm.vote}
              onChange={e => setVoteForm({ ...voteForm, vote: e.target.value })}
              label="Ваш голос"
              sx={{ color: '#fff' }}
            >
              <MenuItem value="FOR">✅ За</MenuItem>
              <MenuItem value="AGAINST">❌ Против</MenuItem>
              <MenuItem value="ABSTAIN">⚪ Воздержаться</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth multiline rows={2} label="Комментарий (необязательно)"
            value={voteForm.comment}
            onChange={e => setVoteForm({ ...voteForm, comment: e.target.value })}
            InputProps={{ sx: { color: '#fff' } }} InputLabelProps={{ sx: { color: '#888' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoteDialog(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => selectedSession && handleVote(selectedSession.id)}
            sx={{ bgcolor: '#4CAF50' }}
          >
            Проголосовать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
