'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Scale,
  FileText,
  Clock,
  Shield,
} from 'lucide-react';

const LEVEL_NAMES = ['', 'Арбан', 'Цзун', 'Мянган', 'Тумен', 'Республика', 'Конфедерация', 'Суд'];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  FILED: { label: 'Подана', color: '#2196f3' },
  UNDER_REVIEW: { label: 'На рассмотрении', color: '#ff9800' },
  RESPONDED: { label: 'Ответ получен', color: '#00bcd4' },
  ESCALATED_L2: { label: 'Эскалация → Цзун', color: '#e91e63' },
  ESCALATED_L3: { label: 'Эскалация → Мянган', color: '#e91e63' },
  ESCALATED_L4: { label: 'Эскалация → Тумен', color: '#9c27b0' },
  ESCALATED_L5: { label: 'Эскалация → Республика', color: '#9c27b0' },
  ESCALATED_L6: { label: 'Эскалация → Конфедерация', color: '#673ab7' },
  IN_COURT: { label: 'В суде', color: '#f44336' },
  RESOLVED: { label: 'Решена', color: '#4caf50' },
  DISMISSED: { label: 'Отклонена', color: '#9e9e9e' },
};

const SOURCE_LABELS: Record<string, string> = {
  CONTRACT: 'Договор',
  QUEST: 'Задание',
  WORK_ACT: 'Акт работ',
};

export default function ComplaintsPage() {
  const [tab, setTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0, filed: 0, underReview: 0, inCourt: 0, resolved: 0,
    byLevel: [] as { level: number; name: string; count: number }[],
  });

  useEffect(() => {
    // Mock data
    setStats({
      total: 8,
      filed: 2,
      underReview: 3,
      inCourt: 1,
      resolved: 2,
      byLevel: [
        { level: 1, name: 'Арбан', count: 2 },
        { level: 2, name: 'Цзун', count: 1 },
        { level: 3, name: 'Мянган', count: 1 },
        { level: 4, name: 'Тумен', count: 0 },
        { level: 5, name: 'Республика', count: 0 },
        { level: 6, name: 'Конфедерация', count: 0 },
        { level: 7, name: 'Суд', count: 1 },
      ],
    });

    setComplaints([
      {
        id: '1',
        title: 'Нарушение сроков поставки по договору DC-2026/001',
        category: 'FINANCIAL_DISPUTE',
        sourceType: 'CONTRACT',
        sourceId: 'c-001',
        currentLevel: 2,
        status: 'ESCALATED_L2',
        filer: { username: 'Иванов А.' },
        targetUser: { username: 'Петров Б.' },
        deadline: '2026-02-17T10:00:00Z',
        createdAt: '2026-02-03T10:00:00Z',
        _count: { responses: 2, escalationHistory: 1 },
      },
      {
        id: '2',
        title: 'Качество выполнения задания Q-042',
        category: 'SERVICE_QUALITY',
        sourceType: 'QUEST',
        sourceId: 'q-042',
        currentLevel: 1,
        status: 'FILED',
        filer: { username: 'Сидоров В.' },
        targetUser: { username: 'Козлова Г.' },
        deadline: '2026-02-18T14:30:00Z',
        createdAt: '2026-02-11T14:30:00Z',
        _count: { responses: 0, escalationHistory: 0 },
      },
      {
        id: '3',
        title: 'Отказ в приёмке акта работ WA-007',
        category: 'WORKPLACE',
        sourceType: 'WORK_ACT',
        sourceId: 'wa-007',
        currentLevel: 7,
        status: 'IN_COURT',
        filer: { username: 'Николаев Д.' },
        targetUser: { username: 'Фёдорова Е.' },
        deadline: null,
        createdAt: '2026-01-20T09:15:00Z',
        _count: { responses: 5, escalationHistory: 6 },
      },
    ]);
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle size={32} />
          Жалобы
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Система жалоб с иерархической эскалацией. Каждая жалоба привязана к договору, заданию или акту работ.
        </Typography>
      </Box>

      {/* Hierarchy Progress */}
      <Card sx={{ mb: 4, border: '1px solid #e3f2fd' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            📊 Жалобы по уровням иерархии
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {stats.byLevel.map((level) => (
              <Chip
                key={level.level}
                label={`${level.name}: ${level.count}`}
                size="small"
                sx={{
                  bgcolor: level.count > 0 ? '#ff980020' : '#f5f5f5',
                  color: level.count > 0 ? '#e65100' : '#999',
                  fontWeight: 600,
                  border: level.count > 0 ? '1px solid #ff9800' : '1px solid #e0e0e0',
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Арбан → Цзун → Мянган → Тумен → Республика → Конфедерация → Суд
          </Typography>
        </CardContent>
      </Card>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2, mb: 4 }}>
        {[
          { label: 'Всего', value: stats.total, color: '#2196f3', icon: <FileText size={18} /> },
          { label: 'Подано', value: stats.filed, color: '#ff9800', icon: <Clock size={18} /> },
          { label: 'Рассматривается', value: stats.underReview, color: '#00bcd4', icon: <Shield size={18} /> },
          { label: 'В суде', value: stats.inCourt, color: '#f44336', icon: <Scale size={18} /> },
          { label: 'Решено', value: stats.resolved, color: '#4caf50', icon: <CheckCircle size={18} /> },
        ].map((stat) => (
          <Card key={stat.label} sx={{ border: `1px solid ${stat.color}20` }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
              <Box sx={{ color: stat.color, opacity: 0.4 }}>{stat.icon}</Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" color="warning" startIcon={<AlertTriangle size={18} />} onClick={() => setOpenDialog(true)}>
          Подать жалобу
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        ⚠️ Жалоба должна быть привязана к конкретному договору, заданию или акту работ. «Из воздуха» жаловаться нельзя.
        Если вопрос можно решить переговорами — сначала откройте <strong>спор</strong>.
      </Alert>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Все жалобы" />
        <Tab label="Мои жалобы" />
        <Tab label="Жалобная книга" />
      </Tabs>

      {/* Complaint List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {complaints.map((complaint) => {
          const statusInfo = STATUS_LABELS[complaint.status] || { label: complaint.status, color: '#999' };
          const daysLeft = complaint.deadline
            ? Math.ceil((new Date(complaint.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <Card
              key={complaint.id}
              sx={{ border: '1px solid #e0e0e0', '&:hover': { borderColor: '#1976d2', boxShadow: 2 }, transition: 'all 0.2s' }}
            >
              <CardContent>
                {/* Title row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{complaint.title}</Typography>
                  <Chip
                    label={statusInfo.label}
                    size="small"
                    sx={{ bgcolor: `${statusInfo.color}15`, color: statusInfo.color, fontWeight: 600 }}
                  />
                </Box>

                {/* Source + Hierarchy */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <Chip
                    label={SOURCE_LABELS[complaint.sourceType]}
                    size="small"
                    variant="outlined"
                    icon={<FileText size={14} />}
                  />
                  <Chip
                    label={`Уровень ${complaint.currentLevel}: ${LEVEL_NAMES[complaint.currentLevel]}`}
                    size="small"
                    sx={{ bgcolor: '#e3f2fd', fontWeight: 600 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {complaint.filer.username} → {complaint.targetUser?.username}
                  </Typography>
                  {complaint._count.escalationHistory > 0 && (
                    <Chip
                      label={`${complaint._count.escalationHistory} эскалаций`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Hierarchy progress bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Прогресс эскалации</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {complaint.currentLevel} / 7
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(complaint.currentLevel / 7) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor:
                          complaint.currentLevel >= 7
                            ? '#f44336'
                            : complaint.currentLevel >= 4
                              ? '#ff9800'
                              : '#2196f3',
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    {LEVEL_NAMES.slice(1).map((name, i) => (
                      <Typography
                        key={name}
                        variant="caption"
                        sx={{
                          fontSize: '0.6rem',
                          color: i + 1 <= complaint.currentLevel ? '#1976d2' : '#bbb',
                          fontWeight: i + 1 === complaint.currentLevel ? 700 : 400,
                        }}
                      >
                        {name}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                {/* Deadline + Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {daysLeft !== null && daysLeft > 0 && (
                      <Chip
                        label={`⏰ ${daysLeft} дн. до авто-эскалации`}
                        size="small"
                        color={daysLeft <= 2 ? 'error' : 'default'}
                        variant="outlined"
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Ответов: {complaint._count.responses}
                    </Typography>
                  </Box>

                  {!['RESOLVED', 'DISMISSED', 'IN_COURT'].includes(complaint.status) && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<ArrowUpRight size={14} />}>
                        Эскалировать
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<Scale size={14} />}>
                        В суд
                      </Button>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* File Complaint Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Подать жалобу</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Жалоба должна быть привязана к конкретному договору, заданию или акту работ.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Тип источника</InputLabel>
              <Select defaultValue="CONTRACT" label="Тип источника">
                <MenuItem value="CONTRACT">Договор</MenuItem>
                <MenuItem value="QUEST">Задание</MenuItem>
                <MenuItem value="WORK_ACT">Акт работ</MenuItem>
              </Select>
            </FormControl>
            <TextField label="ID документа" fullWidth />
            <FormControl fullWidth>
              <InputLabel>Категория</InputLabel>
              <Select defaultValue="FINANCIAL_DISPUTE" label="Категория">
                <MenuItem value="SERVICE_QUALITY">Качество услуг</MenuItem>
                <MenuItem value="CORRUPTION">Коррупция</MenuItem>
                <MenuItem value="RIGHTS_VIOLATION">Нарушение прав</MenuItem>
                <MenuItem value="FINANCIAL_DISPUTE">Финансовый спор</MenuItem>
                <MenuItem value="WORKPLACE">Рабочий вопрос</MenuItem>
                <MenuItem value="GOVERNANCE">Управление</MenuItem>
              </Select>
            </FormControl>
            <TextField label="ID ответчика" fullWidth />
            <TextField label="Заголовок" fullWidth />
            <TextField label="Описание" multiline rows={3} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button variant="contained" color="warning" onClick={() => setOpenDialog(false)}>Подать жалобу</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
