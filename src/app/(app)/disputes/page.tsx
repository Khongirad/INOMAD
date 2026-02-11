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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Handshake,
  Scale,
  AlertTriangle,
  MessageSquare,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Clock,
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPENED: { label: 'Открыт', color: '#2196f3' },
  NEGOTIATING: { label: 'Переговоры', color: '#ff9800' },
  SETTLED: { label: 'Урегулирован', color: '#4caf50' },
  COMPLAINT_FILED: { label: 'Подана жалоба', color: '#f44336' },
  COURT_FILED: { label: 'Передано в суд', color: '#9c27b0' },
};

const SOURCE_LABELS: Record<string, string> = {
  CONTRACT: 'Договор',
  QUEST: 'Задание',
  WORK_ACT: 'Акт работ',
};

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    partyBId: '',
    sourceType: 'CONTRACT' as string,
    sourceId: '',
    title: '',
    description: '',
  });
  const [stats, setStats] = useState({ total: 0, open: 0, settled: 0, escalated: 0 });

  // Mock data for demonstration
  useEffect(() => {
    setDisputes([
      {
        id: '1',
        partyA: { username: 'Иванов А.' },
        partyB: { username: 'Петров Б.' },
        sourceType: 'CONTRACT',
        sourceId: 'c-001',
        title: 'Нарушение сроков поставки',
        description: 'Контрагент не выполнил поставку в установленный договором срок',
        status: 'NEGOTIATING',
        createdAt: '2026-02-10T10:00:00Z',
        _count: { complaints: 0 },
      },
      {
        id: '2',
        partyA: { username: 'Сидоров В.' },
        partyB: { username: 'Козлова Г.' },
        sourceType: 'QUEST',
        sourceId: 'q-042',
        title: 'Качество выполненного задания',
        description: 'Результат не соответствует описанию задания',
        status: 'OPENED',
        createdAt: '2026-02-09T14:30:00Z',
        _count: { complaints: 0 },
      },
      {
        id: '3',
        partyA: { username: 'Николаев Д.' },
        partyB: { username: 'Фёдорова Е.' },
        sourceType: 'WORK_ACT',
        sourceId: 'wa-007',
        title: 'Несогласие с актом выполненных работ',
        description: 'Заказчик не принимает акт из-за дефектов',
        status: 'SETTLED',
        createdAt: '2026-02-08T09:15:00Z',
        _count: { complaints: 0 },
      },
    ]);
    setStats({ total: 3, open: 2, settled: 1, escalated: 0 });
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Handshake size={32} />
          Споры
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Переговоры по спорным вопросам. Каждый спор привязан к договору, заданию или акту работ.
        </Typography>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 4 }}>
        {[
          { label: 'Всего споров', value: stats.total, icon: <FileText size={20} />, color: '#2196f3' },
          { label: 'Открытых', value: stats.open, icon: <Clock size={20} />, color: '#ff9800' },
          { label: 'Урегулировано', value: stats.settled, icon: <CheckCircle size={20} />, color: '#4caf50' },
          { label: 'Эскалировано', value: stats.escalated, icon: <ArrowUpRight size={20} />, color: '#f44336' },
        ].map((stat) => (
          <Card key={stat.label} sx={{ border: `1px solid ${stat.color}20` }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              </Box>
              <Box sx={{ color: stat.color, opacity: 0.5 }}>{stat.icon}</Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" startIcon={<AlertTriangle size={18} />} onClick={() => setOpenDialog(true)}>
          Открыть спор
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 Спор — первый шаг перед жалобой. Стороны пытаются решить вопрос сами. Если не получается — можно подать жалобу (мягкий путь) или сразу в суд (жёсткий путь).
      </Alert>

      {/* Dispute List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {disputes.map((dispute) => {
          const status = STATUS_LABELS[dispute.status] || { label: dispute.status, color: '#999' };
          return (
            <Card
              key={dispute.id}
              sx={{
                cursor: 'pointer',
                border: selectedDispute?.id === dispute.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                '&:hover': { borderColor: '#1976d2', boxShadow: 2 },
                transition: 'all 0.2s',
              }}
              onClick={() => setSelectedDispute(dispute)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{dispute.title}</Typography>
                  <Chip
                    label={status.label}
                    size="small"
                    sx={{ bgcolor: `${status.color}15`, color: status.color, fontWeight: 600 }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {dispute.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    label={SOURCE_LABELS[dispute.sourceType]}
                    size="small"
                    variant="outlined"
                    icon={<FileText size={14} />}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {dispute.partyA.username} ↔ {dispute.partyB.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(dispute.createdAt).toLocaleDateString('ru-RU')}
                  </Typography>
                </Box>

                {/* Actions for open disputes */}
                {['OPENED', 'NEGOTIATING'].includes(dispute.status) && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<MessageSquare size={14} />}>
                      Переговоры
                    </Button>
                    <Button size="small" variant="outlined" color="success" startIcon={<CheckCircle size={14} />}>
                      Урегулировать
                    </Button>
                    <Button size="small" variant="outlined" color="warning" startIcon={<AlertTriangle size={14} />}>
                      Подать жалобу
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<Scale size={14} />}>
                      В суд
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Open Dispute Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Открыть спор</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Спор всегда привязан к конкретному договору, заданию или акту работ.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Тип источника</InputLabel>
              <Select
                value={formData.sourceType}
                label="Тип источника"
                onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
              >
                <MenuItem value="CONTRACT">Договор</MenuItem>
                <MenuItem value="QUEST">Задание</MenuItem>
                <MenuItem value="WORK_ACT">Акт работ</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="ID документа"
              value={formData.sourceId}
              onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
              fullWidth
            />
            <TextField
              label="ID второй стороны"
              value={formData.partyBId}
              onChange={(e) => setFormData({ ...formData, partyBId: e.target.value })}
              fullWidth
            />
            <TextField
              label="Тема спора"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            Открыть спор
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
