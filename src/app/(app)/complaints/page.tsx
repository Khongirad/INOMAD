'use client';

import * as React from 'react';
import {
  AlertTriangle, Plus, Search, Filter, ChevronRight,
  Clock, CheckCircle2, XCircle, Scale, MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

interface Complaint {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  filer: { id: string; username: string };
  targetUser?: { id: string; username: string };
  targetOrgId?: string;
  assignee?: { id: string; username: string };
  _count?: { responses: number };
}

interface ComplaintStats {
  total: number;
  filed: number;
  underReview: number;
  responded: number;
  escalated: number;
  resolved: number;
  dismissed: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  FILED: { label: 'Подана', color: 'text-amber-500 bg-amber-500/10', icon: Clock },
  UNDER_REVIEW: { label: 'На рассмотрении', color: 'text-blue-500 bg-blue-500/10', icon: Search },
  RESPONDED: { label: 'Ответ получен', color: 'text-purple-500 bg-purple-500/10', icon: MessageSquare },
  ESCALATED: { label: 'Передано в суд', color: 'text-red-500 bg-red-500/10', icon: Scale },
  RESOLVED: { label: 'Решено', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
  DISMISSED: { label: 'Отклонено', color: 'text-zinc-500 bg-zinc-500/10', icon: XCircle },
};

const categoryLabels: Record<string, string> = {
  SERVICE_QUALITY: 'Качество услуг',
  CORRUPTION: 'Коррупция',
  RIGHTS_VIOLATION: 'Нарушение прав',
  FINANCIAL_DISPUTE: 'Финансовый спор',
  WORKPLACE: 'Рабочие отношения',
  GOVERNANCE: 'Управление',
  OTHER: 'Другое',
};

export default function ComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [stats, setStats] = React.useState<ComplaintStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState('all');

  // Form state
  const [formTitle, setFormTitle] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('SERVICE_QUALITY');
  const [formTargetOrgId, setFormTargetOrgId] = React.useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [complaintsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/complaints/my`, { headers }),
        fetch(`${API_BASE}/api/complaints/stats`, { headers }),
      ]);

      if (complaintsRes.ok) {
        const data = await complaintsRes.json();
        setComplaints(data.complaints || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitComplaint = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          targetOrgId: formTargetOrgId || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Жалоба подана');
        setShowForm(false);
        setFormTitle('');
        setFormDescription('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Ошибка');
      }
    } catch (e) {
      toast.error('Ошибка сети');
    }
  };

  const filtered = filterStatus === 'all'
    ? complaints
    : complaints.filter((c) => c.status === filterStatus);

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <AlertTriangle className="text-amber-500 w-8 h-8" />
            Жалобы и обращения
          </h2>
          <p className="text-zinc-400 mt-1">
            Подайте жалобу на организацию или гражданина. Если не решено — эскалация в суд.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Подать жалобу
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const count = stats[key.toLowerCase().replace(/_/g, '') as keyof ComplaintStats] || 0;
            return (
              <Card key={key} className="border-white/5">
                <CardContent className="p-3 text-center">
                  <Icon className={cn("h-5 w-5 mx-auto mb-1", cfg.color.split(' ')[0])} />
                  <div className="text-lg font-mono font-bold text-white">{count as number}</div>
                  <div className="text-[10px] text-zinc-500 uppercase">{cfg.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Complaint Form */}
      {showForm && (
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-base text-amber-400">Новая жалоба</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Заголовок жалобы"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="bg-zinc-900 border-white/10"
            />
            <textarea
              placeholder="Подробное описание проблемы..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-zinc-900 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
            <div className="flex gap-4">
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm"
              >
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <Input
                placeholder="ID организации (опционально)"
                value={formTargetOrgId}
                onChange={(e) => setFormTargetOrgId(e.target.value)}
                className="bg-zinc-900 border-white/10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={submitComplaint} className="bg-amber-600 hover:bg-amber-700">
                Подать
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-white/10 text-zinc-400"
              >
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilterStatus('all')}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            filterStatus === 'all'
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "text-zinc-500 hover:text-zinc-300 border border-white/5"
          )}
        >
          Все ({complaints.length})
        </button>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              filterStatus === key
                ? `${cfg.color} border border-current/30`
                : "text-zinc-500 hover:text-zinc-300 border border-white/5"
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-zinc-500">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Нет жалоб</h3>
              <p className="text-zinc-500 text-sm">У вас пока нет поданных жалоб</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((complaint) => {
            const cfg = statusConfig[complaint.status] || statusConfig.FILED;
            const Icon = cfg.icon;

            return (
              <Card
                key={complaint.id}
                className="border-white/5 bg-zinc-900/30 hover:border-amber-500/20 transition-all cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("mt-1 p-1.5 rounded", cfg.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white">{complaint.title}</h4>
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                          {complaint.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            cfg.color
                          )}>
                            {cfg.label}
                          </span>
                          <span>{categoryLabels[complaint.category] || complaint.category}</span>
                          <span>
                            {new Date(complaint.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                          {complaint._count?.responses ? (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {complaint._count.responses}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-600 mt-1 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
