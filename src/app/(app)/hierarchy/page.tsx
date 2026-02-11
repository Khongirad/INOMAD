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
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Collapse,
  Stack,
  Divider,
  Badge,
} from '@mui/material';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Building2,
  Shield,
  Crown,
  Handshake,
  Globe,
  ArrowRightLeft,
  Plus,
  TreePine,
} from 'lucide-react';

// Level colors
const LEVEL_COLORS: Record<string, string> = {
  confederation: '#FFB800',
  republic: '#2196F3',
  tumen: '#9C27B0',
  myangan: '#4CAF50',
  zun: '#FF9800',
  arban: '#F44336',
};

const LEVEL_LABELS: Record<string, string> = {
  confederation: 'Конфедерация',
  republic: 'Республика',
  tumen: 'Тумэн (10 000)',
  myangan: 'Мянган (1 000)',
  zun: 'Цзун (100)',
  arban: 'Арбан (10)',
};

// Collapsible tree node
function TreeNode({ level, name, children: childNodes, count, leader, isLast, onSelect, extra }: {
  level: string;
  name: string;
  children?: React.ReactNode;
  count?: number;
  leader?: string;
  isLast?: boolean;
  onSelect?: () => void;
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(level === 'confederation' || level === 'republic');
  const hasChildren = !!childNodes;

  return (
    <Box sx={{ ml: level === 'confederation' ? 0 : 2, mb: 0.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 1,
          cursor: hasChildren ? 'pointer' : 'default',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
          borderLeft: `3px solid ${LEVEL_COLORS[level] || '#666'}`,
        }}
        onClick={() => { if (hasChildren) setOpen(!open); }}
      >
        {hasChildren ? (
          open ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        ) : (
          <Box sx={{ width: 16 }} />
        )}

        <Chip
          label={LEVEL_LABELS[level] || level}
          size="small"
          sx={{
            bgcolor: LEVEL_COLORS[level] || '#666',
            color: '#000',
            fontWeight: 700,
            fontSize: '0.65rem',
            height: 20,
          }}
        />

        <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff', flex: 1 }}>
          {name}
        </Typography>

        {count !== undefined && (
          <Chip
            label={`${count} чел.`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20, borderColor: '#555' }}
          />
        )}

        {leader && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Crown size={12} color="#FFB800" />
            <Typography variant="caption" sx={{ color: '#aaa' }}>
              {leader}
            </Typography>
          </Stack>
        )}

        {extra}
      </Box>

      {hasChildren && (
        <Collapse in={open}>
          <Box sx={{ ml: 1 }}>
            {childNodes}
          </Box>
        </Collapse>
      )}
    </Box>
  );
}

// Stats card
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #333', flex: 1, minWidth: 140 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ color: '#888' }}>{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function HierarchyPage() {
  const [tab, setTab] = useState(0);
  const [tree, setTree] = useState<any>(null);
  const [tumens, setTumens] = useState<any[]>([]);
  const [cooperations, setCooperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coopDialog, setCoopDialog] = useState(false);
  const [coopForm, setCoopForm] = useState({ targetTumenId: '', title: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [treeRes, tumensRes] = await Promise.all([
        fetch('/api/hierarchy/tree', { headers }),
        fetch('/api/hierarchy/tumens', { headers }),
      ]);

      if (treeRes.ok) setTree(await treeRes.json());
      if (tumensRes.ok) setTumens(await tumensRes.json());
    } catch (err) {
      console.error('Failed to load hierarchy', err);
    } finally {
      setLoading(false);
    }
  };

  // Count totals
  const totalRepublics = tree?.republics?.length || 0;
  const totalTumens = tumens.length;
  const totalMyangans = tumens.reduce((a: number, t: any) => a + (t.memberMyangans?.length || 0), 0);
  const totalCoops = tumens.reduce((a: number, t: any) =>
    a + (t.cooperationsAsA?.length || 0) + (t.cooperationsAsB?.length || 0), 0
  ) / 2;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TreePine size={28} color="#FFB800" />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
            Иерархия / Hierarchy
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Арбан(10) → Цзун(100) → Мянган(1000) → Тумэн(10 000) → Республика → Конфедерация
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        <StatCard label="Республики" value={totalRepublics} color={LEVEL_COLORS.republic} />
        <StatCard label="Тумэны" value={totalTumens} color={LEVEL_COLORS.tumen} />
        <StatCard label="Мянганы" value={totalMyangans} color={LEVEL_COLORS.myangan} />
        <StatCard label="Сотрудничества" value={Math.floor(totalCoops)} color="#FF9800" />
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="🌳 Дерево иерархии" />
        <Tab label="🤝 Сотрудничество Тумэнов" />
      </Tabs>

      {/* Tab 0: Tree */}
      {tab === 0 && (
        <Card sx={{ bgcolor: '#0d1117', border: '1px solid #333', p: 2 }}>
          {tree?.confederation && (
            <TreeNode
              level="confederation"
              name={tree.confederation.name || 'Конфедеративный Хурал'}
              count={tree.confederation.totalMembers}
            >
              {tree.republics?.map((republic: any) => (
                <TreeNode
                  key={republic.id}
                  level="republic"
                  name={republic.name}
                  count={republic.totalMembers}
                >
                  {republic.memberTumens?.map((tumen: any) => (
                    <TreeNode
                      key={tumen.id}
                      level="tumen"
                      name={tumen.name}
                      count={tumen.totalMembers}
                      extra={
                        (tumen.cooperationsAsA?.length > 0 || tumen.cooperationsAsB?.length > 0) && (
                          <Badge
                            badgeContent={
                              (tumen.cooperationsAsA?.length || 0) + (tumen.cooperationsAsB?.length || 0)
                            }
                            color="warning"
                          >
                            <Handshake size={14} color="#FF9800" />
                          </Badge>
                        )
                      }
                    >
                      {tumen.memberMyangans?.map((myangan: any) => (
                        <TreeNode
                          key={myangan.id}
                          level="myangan"
                          name={myangan.name}
                          count={myangan.totalMembers}
                        >
                          {myangan.memberZuns?.map((zun: any) => (
                            <TreeNode
                              key={zun.id}
                              level="zun"
                              name={zun.name}
                              count={zun.memberArbans?.length ? zun.memberArbans.length * 10 : 0}
                            >
                              {zun.memberArbans?.map((arban: any) => (
                                <TreeNode
                                  key={arban.id}
                                  level="arban"
                                  name={`Арбан #${arban.arbanId}`}
                                  count={10}
                                />
                              ))}
                            </TreeNode>
                          ))}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  ))}
                </TreeNode>
              ))}
            </TreeNode>
          )}

          {!tree?.confederation && !loading && (
            <Alert severity="info" sx={{ bgcolor: '#1a1a2e' }}>
              Иерархия ещё не создана. Начните с создания Арбанов и Цзунов.
            </Alert>
          )}
        </Card>
      )}

      {/* Tab 1: Tumen Cooperation */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff' }}>
              🤝 Сотрудничество Тумэнов
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => setCoopDialog(true)}
              sx={{ bgcolor: '#9C27B0' }}
            >
              Предложить
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2, bgcolor: '#1a1a2e' }}>
            <strong>Тумэны не объединяются</strong> — они могут только сотрудничать.
            Каждый Тумэн остаётся суверенной единицей с собственным лидером и управлением.
          </Alert>

          {tumens.map((tumen: any) => {
            const allCoops = [
              ...(tumen.cooperationsAsA || []).map((c: any) => ({
                ...c,
                partner: c.tumenB,
                direction: 'outgoing',
              })),
              ...(tumen.cooperationsAsB || []).map((c: any) => ({
                ...c,
                partner: c.tumenA,
                direction: 'incoming',
              })),
            ];

            if (allCoops.length === 0) return null;

            return (
              <Card key={tumen.id} sx={{ bgcolor: '#1a1a2e', border: '1px solid #333', mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Shield size={18} color={LEVEL_COLORS.tumen} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>
                      {tumen.name}
                    </Typography>
                    <Chip label={tumen.region} size="small" variant="outlined" sx={{ height: 20 }} />
                  </Box>

                  <Divider sx={{ my: 1, borderColor: '#333' }} />

                  {allCoops.map((coop: any) => (
                    <Box
                      key={coop.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        mb: 0.5,
                      }}
                    >
                      <ArrowRightLeft size={14} color="#FF9800" />
                      <Typography variant="body2" sx={{ color: '#fff', flex: 1 }}>
                        ↔ {coop.partner?.name || 'Unknown'}
                      </Typography>
                      <Chip
                        label={coop.title}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                      <Chip
                        label={coop.status}
                        size="small"
                        color={coop.status === 'ACTIVE' ? 'success' : coop.status === 'PROPOSED' ? 'warning' : 'default'}
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {tumens.every((t: any) =>
            (t.cooperationsAsA?.length || 0) + (t.cooperationsAsB?.length || 0) === 0
          ) && (
            <Alert severity="info" sx={{ bgcolor: '#1a1a2e' }}>
              Пока нет активных сотрудничеств между Тумэнами.
            </Alert>
          )}
        </Box>
      )}

      {/* Cooperation dialog */}
      <Dialog open={coopDialog} onClose={() => setCoopDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a2e', color: '#fff' } }}
      >
        <DialogTitle>Предложить сотрудничество</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, bgcolor: '#0d1117' }}>
            Сотрудничество — это договор между двумя Тумэнами. Тумэны остаются независимыми.
          </Alert>
          <TextField
            fullWidth
            label="ID целевого Тумэна"
            value={coopForm.targetTumenId}
            onChange={e => setCoopForm({ ...coopForm, targetTumenId: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            InputProps={{ sx: { color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#888' } }}
          />
          <TextField
            fullWidth
            label="Название соглашения"
            value={coopForm.title}
            onChange={e => setCoopForm({ ...coopForm, title: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{ sx: { color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#888' } }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Описание"
            value={coopForm.description}
            onChange={e => setCoopForm({ ...coopForm, description: e.target.value })}
            InputProps={{ sx: { color: '#fff' } }}
            InputLabelProps={{ sx: { color: '#888' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoopDialog(false)}>Отмена</Button>
          <Button variant="contained" sx={{ bgcolor: '#9C27B0' }}>Предложить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
