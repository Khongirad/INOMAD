'use client';

import React from 'react';
import {
  Scale, Gavel, FileText, Clock, CheckCircle,
  AlertTriangle, Loader2, Users, Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCases, useCaseStats } from '@/lib/api';
import type { CourtCase } from '@/lib/types/models';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  FILED: { label: 'Filed', color: 'text-blue-400' },
  HEARING_SCHEDULED: { label: 'Заседание назначено', color: 'text-cyan-400' },
  IN_HEARING: { label: 'Слушание', color: 'text-amber-400' },
  VERDICT_ISSUED: { label: 'Verdict rendered', color: 'text-emerald-400' },
  ENFORCING: { label: 'Исgenderнение', color: 'text-orange-400' },
  CLOSED: { label: 'Закрыто', color: 'text-zinc-400' },
  APPEALED: { label: 'Appeal', color: 'text-purple-400' },
};

export default function CourtsPage() {
  const [tab, setTab] = React.useState('all');
  const { data: cases = [], isLoading } = useCases();
  const { data: stats } = useCaseStats();

  const defaultStats = stats || { total: 0, filed: 0, inHearing: 0, verdictIssued: 0, closed: 0 };

  const filteredCases =
    tab === 'all'
      ? cases
      : tab === 'active'
        ? cases.filter((c: CourtCase) => ['FILED', 'HEARING_SCHEDULED', 'IN_HEARING'].includes(c.status))
        : cases.filter((c: CourtCase) => ['VERDICT_ISSUED', 'CLOSED'].includes(c.status));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-7 w-7 text-purple-400" />
          Court
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Разdecision disputeов, механизмы принуждения и рамки легитимности. Совет rightcourtия.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total дел', value: defaultStats.total, icon: FileText, cls: 'text-blue-400' },
          { label: 'Filed', value: defaultStats.filed, icon: Clock, cls: 'text-amber-400' },
          { label: 'Слушания', value: defaultStats.inHearing, icon: Gavel, cls: 'text-cyan-400' },
          { label: 'Verdict', value: defaultStats.verdictIssued, icon: CheckCircle, cls: 'text-emerald-400' },
          { label: 'Закрыто', value: defaultStats.closed, icon: Scale, cls: 'text-zinc-400' },
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

      {/* Info */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-sm text-zinc-300">
        ⚖️ Courtебные дела создаются через эскалацию disputeов or жалоб. Court рассматривает case, назначает заседания и выносит вердикт.
      </div>

      {/* Tabs + case list */}
      <Tabs defaultValue="all" value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="all">All дела</TabsTrigger>
          <TabsTrigger value="active">Activые</TabsTrigger>
          <TabsTrigger value="closed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Scale className="h-12 w-12 mx-auto opacity-30" />
              <p>Courtебных дел нет</p>
              <p className="text-xs">Cases are created through escalation disputeов or жалоб</p>
            </div>
          ) : (
            filteredCases.map((c: CourtCase) => {
              const statusInfo = STATUS_LABELS[c.status] || { label: c.status, color: 'text-zinc-400' };
              return (
                <Card key={c.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">Case {c.caseNumber}</p>
                        <h3 className="font-semibold text-zinc-100">{c.title}</h3>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-400">{c.description}</p>

                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.plaintiff?.username} vs {c.defendant?.username}
                      </span>
                      {c.judge && (
                        <span className="px-2 py-0.5 bg-purple-500/10 rounded text-purple-300 flex items-center gap-1">
                          <Gavel className="h-3 w-3" />
                          Judge: {c.judge.username}
                        </span>
                      )}
                      {c.hearingDate && (
                        <span className="px-2 py-0.5 bg-cyan-500/10 rounded text-cyan-300 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(c.hearingDate).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      <span className="text-zinc-600">
                        {new Date(c.filedAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    {c.verdict && (
                      <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
                        📋 Verdict: {c.verdict}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
