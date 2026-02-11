'use client';

import * as React from 'react';
import {
  FileCheck, Plus, Clock, CheckCircle2, PenTool, AlertTriangle,
  XCircle, ChevronRight, DollarSign, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';
import { toast } from 'sonner';

interface WorkAct {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  contractor: { id: string; username: string };
  client: { id: string; username: string };
  contractorSignedAt: string | null;
  clientSignedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFTED: { label: 'Черновик', color: 'text-zinc-400 bg-zinc-500/10', icon: Clock },
  SUBMITTED: { label: 'На проверке', color: 'text-blue-400 bg-blue-500/10', icon: FileCheck },
  REVIEWED: { label: 'Проверен', color: 'text-purple-400 bg-purple-500/10', icon: CheckCircle2 },
  SIGNED_BY_CONTRACTOR: { label: 'Подписан подрядчиком', color: 'text-amber-400 bg-amber-500/10', icon: PenTool },
  SIGNED_BY_CLIENT: { label: 'Подписан заказчиком', color: 'text-emerald-400 bg-emerald-500/10', icon: PenTool },
  COMPLETED: { label: 'Выполнен', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
  DISPUTED: { label: 'Оспорен', color: 'text-red-500 bg-red-500/10', icon: AlertTriangle },
  CANCELLED: { label: 'Отменён', color: 'text-zinc-500 bg-zinc-500/10', icon: XCircle },
};

export default function WorkActsPage() {
  const { user } = useAuth();
  const [myActs, setMyActs] = React.useState<WorkAct[]>([]);
  const [reviewActs, setReviewActs] = React.useState<WorkAct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'my' | 'review'>('my');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [myRes, reviewRes] = await Promise.all([
        fetch(`${API_BASE}/api/work-acts/my`, { headers }),
        fetch(`${API_BASE}/api/work-acts/reviews`, { headers }),
      ]);

      if (myRes.ok) {
        const data = await myRes.json();
        setMyActs(data.workActs || []);
      }
      if (reviewRes.ok) {
        const data = await reviewRes.json();
        setReviewActs(data.workActs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actId: string, action: string, body?: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/work-acts/${actId}/${action}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        toast.success('Действие выполнено');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Ошибка');
      }
    } catch (e) {
      toast.error('Ошибка сети');
    }
  };

  const activeActs = tab === 'my' ? myActs : reviewActs;
  const totalAmount = activeActs
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileCheck className="text-emerald-500 w-8 h-8" />
            Акты выполненных работ
          </h2>
          <p className="text-zinc-400 mt-1">
            Создавайте, подписывайте и отслеживайте акты. Оплата после подписания обеими сторонами.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Создать акт
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <FileCheck className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Всего актов</div>
                <div className="text-lg font-mono font-bold text-white">
                  {myActs.length + reviewActs.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Выполнено ALTN</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {totalAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Ожидают подписи</div>
                <div className="text-lg font-mono font-bold text-amber-500">
                  {activeActs.filter((a) => ['SUBMITTED', 'REVIEWED', 'SIGNED_BY_CONTRACTOR'].includes(a.status)).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Споры</div>
                <div className="text-lg font-mono font-bold text-red-500">
                  {activeActs.filter((a) => a.status === 'DISPUTED').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        <button
          onClick={() => setTab('my')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === 'my'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Мои акты ({myActs.length})
        </button>
        <button
          onClick={() => setTab('review')}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            tab === 'review'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          На проверку ({reviewActs.length})
        </button>
      </div>

      {/* Work Acts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-zinc-500">Загрузка...</div>
        ) : activeActs.length === 0 ? (
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-8 text-center">
              <FileCheck className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-1">Нет актов</h3>
              <p className="text-zinc-500 text-sm">Создайте первый акт выполненных работ</p>
            </CardContent>
          </Card>
        ) : (
          activeActs.map((act) => {
            const cfg = statusConfig[act.status] || statusConfig.DRAFTED;
            const Icon = cfg.icon;
            const isContractor = act.contractor.id === user?.id;

            return (
              <Card
                key={act.id}
                className="border-white/5 bg-zinc-900/30 hover:border-emerald-500/20 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("mt-1 p-1.5 rounded", cfg.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white">{act.title}</h4>
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-1">
                          {act.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                            cfg.color
                          )}>
                            {cfg.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {act.amount.toLocaleString()} {act.currency}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {isContractor ? act.client.username : act.contractor.username}
                          </span>
                          <span>
                            {new Date(act.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {act.status === 'DRAFTED' && isContractor && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(act.id, 'submit')}
                          className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                        >
                          Отправить
                        </Button>
                      )}
                      {act.status === 'SUBMITTED' && !isContractor && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(act.id, 'review')}
                          className="bg-purple-600 hover:bg-purple-700 h-7 text-xs"
                        >
                          Проверить
                        </Button>
                      )}
                      {['REVIEWED', 'SIGNED_BY_CONTRACTOR', 'SIGNED_BY_CLIENT'].includes(act.status) && (
                        <Button
                          size="sm"
                          onClick={() => handleAction(act.id, 'sign', { signature: `SIG-${user?.id}` })}
                          className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                        >
                          Подписать
                        </Button>
                      )}
                      <ChevronRight className="h-5 w-5 text-zinc-600 mt-1" />
                    </div>
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
