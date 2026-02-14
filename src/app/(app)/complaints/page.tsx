'use client';

import React, { useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, CheckCircle, XCircle, Scale,
  FileText, Clock, Shield, Loader2, Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useComplaints,
  useMyComplaints,
  useComplaintStats,
  useFileComplaint,
  useEscalateComplaint,
} from '@/lib/api';
import type { Complaint, ComplaintStatus, DisputeSourceType, ComplaintCategory } from '@/lib/types/models';

const LEVEL_NAMES = ['', 'Арбан', 'Цзун', 'Мянган', 'Тумен', 'Республика', 'Конфедерация', 'Суд'];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  FILED: { label: 'Подана', color: 'text-blue-400' },
  UNDER_REVIEW: { label: 'На рассмотрении', color: 'text-amber-400' },
  RESPONDED: { label: 'Ответ получен', color: 'text-cyan-400' },
  ESCALATED_L2: { label: 'Эскалация → Цзун', color: 'text-pink-400' },
  ESCALATED_L3: { label: 'Эскалация → Мянган', color: 'text-pink-400' },
  ESCALATED_L4: { label: 'Эскалация → Тумен', color: 'text-purple-400' },
  ESCALATED_L5: { label: 'Эскалация → Республика', color: 'text-purple-400' },
  ESCALATED_L6: { label: 'Эскалация → Конфедерация', color: 'text-violet-400' },
  IN_COURT: { label: 'В суде', color: 'text-rose-400' },
  RESOLVED: { label: 'Решена', color: 'text-emerald-400' },
  DISMISSED: { label: 'Отклонена', color: 'text-zinc-400' },
};

const SOURCE_LABELS: Record<string, string> = {
  CONTRACT: 'Договор',
  QUEST: 'Задание',
  WORK_ACT: 'Акт работ',
};

const CATEGORY_LABELS: Record<string, string> = {
  SERVICE_QUALITY: 'Качество услуг',
  CORRUPTION: 'Коррупция',
  RIGHTS_VIOLATION: 'Нарушение прав',
  FINANCIAL_DISPUTE: 'Финансовый спор',
  WORKPLACE: 'Рабочий вопрос',
  GOVERNANCE: 'Управление',
  OTHER: 'Другое',
};

export default function ComplaintsPage() {
  const [tab, setTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    sourceType: 'CONTRACT' as DisputeSourceType,
    sourceId: '',
    category: 'FINANCIAL_DISPUTE' as ComplaintCategory,
    targetUserId: '',
    title: '',
    description: '',
  });

  const { data: complaints = [], isLoading } = useComplaints();
  const { data: myComplaints = [] } = useMyComplaints();
  const { data: stats } = useComplaintStats();
  const fileMutation = useFileComplaint();
  const escalateMutation = useEscalateComplaint();

  const defaultStats = stats || {
    total: 0, filed: 0, underReview: 0, inCourt: 0, resolved: 0,
    byLevel: LEVEL_NAMES.slice(1).map((name, i) => ({ level: i + 1, name, count: 0 })),
  };

  const handleFile = async () => {
    try {
      await fileMutation.mutateAsync(form);
      toast.success('Жалоба подана');
      setDialogOpen(false);
      setForm({ sourceType: 'CONTRACT', sourceId: '', category: 'FINANCIAL_DISPUTE', targetUserId: '', title: '', description: '' });
    } catch (e: any) {
      toast.error(e.message || 'Ошибка');
    }
  };

  const handleEscalate = async (id: string) => {
    const reason = prompt('Причина эскалации:');
    if (!reason) return;
    try {
      await escalateMutation.mutateAsync({ id, reason });
      toast.success('Жалоба эскалирована');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const displayList = tab === 'my' ? myComplaints : complaints;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          Жалобы
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Система жалоб с иерархической эскалацией. Каждая жалоба привязана к договору, заданию или акту работ.
        </p>
      </div>

      {/* Hierarchy levels */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-zinc-200 mb-2">📊 Жалобы по уровням иерархии</p>
          <div className="flex flex-wrap gap-1.5">
            {defaultStats.byLevel.map((level) => (
              <span
                key={level.level}
                className={`text-xs px-2 py-0.5 rounded font-semibold border ${
                  level.count > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                }`}
              >
                {level.name}: {level.count}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">
            Арбан → Цзун → Мянган → Тумен → Республика → Конфедерация → Суд
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Всего', value: defaultStats.total, icon: FileText, cls: 'text-blue-400' },
          { label: 'Подано', value: defaultStats.filed, icon: Clock, cls: 'text-amber-400' },
          { label: 'Рассматривается', value: defaultStats.underReview, icon: Shield, cls: 'text-cyan-400' },
          { label: 'В суде', value: defaultStats.inCourt, icon: Scale, cls: 'text-rose-400' },
          { label: 'Решено', value: defaultStats.resolved, icon: CheckCircle, cls: 'text-emerald-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
              <s.icon className={`h-4 w-4 ${s.cls} opacity-40`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Подать жалобу
        </Button>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-zinc-300">
        ⚠️ Жалоба должна быть привязана к конкретному договору, заданию или акту работ.
        Если вопрос можно решить переговорами — сначала откройте <strong>спор</strong>.
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="all">Все жалобы</TabsTrigger>
          <TabsTrigger value="my">Мои жалобы</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : displayList.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Жалоб нет
            </div>
          ) : (
            displayList.map((complaint: Complaint) => {
              const statusInfo = STATUS_LABELS[complaint.status] || {
                label: complaint.status,
                color: 'text-zinc-400',
              };
              const daysLeft = complaint.deadline
                ? Math.ceil(
                    (new Date(complaint.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  )
                : null;
              const escalationPct = (complaint.currentLevel / 7) * 100;

              return (
                <Card
                  key={complaint.id}
                  className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Title + status */}
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-zinc-100">{complaint.title}</h3>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {SOURCE_LABELS[complaint.sourceType] || complaint.sourceType}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-500/10 rounded text-blue-300 font-semibold">
                        Уровень {complaint.currentLevel}: {LEVEL_NAMES[complaint.currentLevel]}
                      </span>
                      <span className="text-zinc-500">
                        {complaint.filer?.username} → {complaint.targetUser?.username}
                      </span>
                      {(complaint._count?.escalationHistory ?? 0) > 0 && (
                        <span className="px-2 py-0.5 border border-amber-500/30 rounded text-amber-400">
                          {complaint._count?.escalationHistory} эскалаций
                        </span>
                      )}
                    </div>

                    {/* Hierarchy progress bar */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-zinc-500">Прогресс эскалации</span>
                        <span className="text-[10px] text-zinc-500">{complaint.currentLevel} / 7</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            complaint.currentLevel >= 7
                              ? 'bg-rose-500'
                              : complaint.currentLevel >= 4
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${escalationPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        {LEVEL_NAMES.slice(1).map((name, i) => (
                          <span
                            key={name}
                            className={`text-[8px] ${
                              i + 1 <= complaint.currentLevel
                                ? 'text-blue-400'
                                : 'text-zinc-600'
                            } ${i + 1 === complaint.currentLevel ? 'font-bold' : ''}`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Deadline + actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 items-center text-xs">
                        {daysLeft !== null && daysLeft > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded border ${
                              daysLeft <= 2
                                ? 'border-rose-500/30 text-rose-400'
                                : 'border-zinc-700 text-zinc-400'
                            }`}
                          >
                            ⏰ {daysLeft} дн. до авто-эскалации
                          </span>
                        )}
                        <span className="text-zinc-500">
                          Ответов: {complaint._count?.responses ?? 0}
                        </span>
                      </div>

                      {!['RESOLVED', 'DISMISSED', 'IN_COURT'].includes(complaint.status) && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 text-xs"
                            onClick={() => handleEscalate(complaint.id)}
                          >
                            <ArrowUpRight className="h-3 w-3 mr-1" /> Эскалировать
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-800 text-rose-400 text-xs"
                          >
                            <Scale className="h-3 w-3 mr-1" /> В суд
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* File Complaint Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-700">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-zinc-100">Подать жалобу</h2>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-zinc-300">
                ⚠️ Жалоба должна быть привязана к конкретному документу.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Тип источника</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100"
                    value={form.sourceType}
                    onChange={(e) => setForm({ ...form, sourceType: e.target.value as DisputeSourceType })}
                  >
                    <option value="CONTRACT">Договор</option>
                    <option value="QUEST">Задание</option>
                    <option value="WORK_ACT">Акт работ</option>
                  </select>
                </div>
                <Input
                  placeholder="ID документа"
                  className="bg-zinc-800 border-zinc-700"
                  value={form.sourceId}
                  onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
                />
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Категория</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ComplaintCategory })}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="ID ответчика"
                  className="bg-zinc-800 border-zinc-700"
                  value={form.targetUserId}
                  onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                />
                <Input
                  placeholder="Заголовок"
                  className="bg-zinc-800 border-zinc-700"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <textarea
                  placeholder="Описание"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-zinc-700" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={handleFile}
                  disabled={fileMutation.isPending}
                >
                  {fileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Подать жалобу
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
