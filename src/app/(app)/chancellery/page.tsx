'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  Building2,
  Search,
  Shield,
  FileText,
  Scale,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function ChancelleryPage() {
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    notarized: 0,
    legallyCertified: 0,
    totalDisputes: 0,
    openDisputes: 0,
    totalComplaints: 0,
    activeComplaints: 0,
  });

  const [contracts, setContracts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);

  useEffect(() => {
    // Mock data
    setStats({
      totalContracts: 156,
      activeContracts: 89,
      notarized: 134,
      legallyCertified: 112,
      totalDisputes: 12,
      openDisputes: 4,
      totalComplaints: 8,
      activeComplaints: 3,
    });

    setContracts([
      {
        id: 'c-001',
        documentNumber: 'DC-2026/001',
        title: 'Договор поставки оборудования',
        issuer: { username: 'Иванов А.' },
        recipient: { username: 'Петров Б.' },
        currentStage: 'SIGNED',
        status: 'ACTIVE',
        transactionAmount: '150000',
        notarization: { notarizedAt: '2026-02-01' },
        legalCert: { compliant: true },
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: 'c-002',
        documentNumber: 'DC-2026/002',
        title: 'Банковская лицензия — ТоргБанк',
        issuer: { username: 'ЦБ Управляющий' },
        recipient: { username: 'ТоргБанк' },
        currentStage: 'NOTARIZED',
        status: 'ACTIVE',
        transactionAmount: null,
        notarization: { notarizedAt: '2026-02-05' },
        legalCert: { compliant: true },
        createdAt: '2026-02-01T12:00:00Z',
      },
      {
        id: 'c-003',
        documentNumber: 'DC-2026/003',
        title: 'Земельный договор — участок №42',
        issuer: { username: 'Сидоров В.' },
        recipient: { username: 'Козлова Г.' },
        currentStage: 'DRAFT',
        status: 'ACTIVE',
        transactionAmount: '50000',
        notarization: null,
        legalCert: null,
        createdAt: '2026-02-10T08:30:00Z',
      },
    ]);

    setDisputes([
      {
        id: 'd-001',
        partyA: { username: 'Иванов А.' },
        partyB: { username: 'Петров Б.' },
        sourceType: 'CONTRACT',
        title: 'Нарушение сроков',
        status: 'NEGOTIATING',
        createdAt: '2026-02-10T10:00:00Z',
        _count: { complaints: 1 },
      },
    ]);
  }, []);

  const STAGE_COLORS: Record<string, string> = {
    DRAFT: '#9e9e9e',
    PENDING_SIGNATURES: '#ff9800',
    SIGNED: '#2196f3',
    NOTARIZED: '#4caf50',
    LEGALLY_CERTIFIED: '#00bcd4',
    ARCHIVED: '#795548',
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Building2 size={32} />
          Канцелярия
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Реестр договоров. Доступ только для нотариусов и юристов.
        </Typography>
      </Box>

      <Alert severity="info" icon={<Shield size={20} />} sx={{ mb: 3 }}>
        🔒 Канцелярия — официальный реестр всех договоров системы. Доступ предоставляется только подтверждённым нотариусам и юристам.
      </Alert>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 4 }}>
        {[
          { label: 'Всего договоров', value: stats.totalContracts, color: '#2196f3' },
          { label: 'Активных', value: stats.activeContracts, color: '#4caf50' },
          { label: 'Нотариально заверено', value: stats.notarized, color: '#00bcd4' },
          { label: 'Юридически проверено', value: stats.legallyCertified, color: '#9c27b0' },
          { label: 'Споров', value: stats.totalDisputes, color: '#ff9800' },
          { label: 'Жалоб', value: stats.totalComplaints, color: '#f44336' },
        ].map((stat) => (
          <Card key={stat.label} sx={{ border: `1px solid ${stat.color}20` }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Search */}
      <TextField
        placeholder="Поиск по номеру, названию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={18} />
            </InputAdornment>
          ),
        }}
      />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Реестр договоров" icon={<FileText size={16} />} iconPosition="start" />
        <Tab label="Споры по договорам" icon={<AlertTriangle size={16} />} iconPosition="start" />
        <Tab label="Жалобы" icon={<Scale size={16} />} iconPosition="start" />
      </Tabs>

      {/* Registry Tab */}
      {tab === 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>Номер</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Название</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Стороны</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Стадия</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Сумма</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Нотариус</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Юрист</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {contract.documentNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{contract.title}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {contract.issuer.username} → {contract.recipient?.username || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={contract.currentStage}
                      size="small"
                      sx={{
                        bgcolor: `${STAGE_COLORS[contract.currentStage] || '#999'}15`,
                        color: STAGE_COLORS[contract.currentStage] || '#999',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {contract.transactionAmount
                      ? `${Number(contract.transactionAmount).toLocaleString()} ₳`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {contract.notarization ? (
                      <CheckCircle size={18} color="#4caf50" />
                    ) : (
                      <XCircle size={18} color="#ccc" />
                    )}
                  </TableCell>
                  <TableCell>
                    {contract.legalCert ? (
                      <CheckCircle size={18} color={contract.legalCert.compliant ? '#4caf50' : '#f44336'} />
                    ) : (
                      <XCircle size={18} color="#ccc" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Disputes Tab */}
      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {disputes.map((dispute) => (
            <Card key={dispute.id} sx={{ border: '1px solid #e0e0e0' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{dispute.title}</Typography>
                  <Chip label={dispute.status} size="small" color="warning" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {dispute.partyA.username} ↔ {dispute.partyB.username} • Жалоб: {dispute._count.complaints}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Complaints Tab */}
      {tab === 2 && (
        <Alert severity="info">
          Жалобы по договорам отображаются здесь. Используйте раздел &quot;Жалобы&quot; для полного управления.
        </Alert>
      )}
    </Box>
  );
}
