'use client';

import React, { useState } from 'react';
import {
  Building2, FileText, Search, Shield, Scale, AlertTriangle,
  CheckCircle, XCircle, Loader2, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useChancelleryRegistry,
  useChancelleryStats,
} from '@/lib/api';
import type { ChancelleryContract } from '@/lib/types/models';

const STAGE_COLORS: Record<string, string> = {
  DRAFT: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  PENDING_SIGNATURES: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  SIGNED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  NOTARIZED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  LEGALLY_CERTIFIED: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  ARCHIVED: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

const STAGE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_SIGNATURES: 'On подписании',
  SIGNED: 'Byдписан',
  NOTARIZED: 'Нотариально заверен',
  LEGALLY_CERTIFIED: 'Юридически проверен',
  ARCHIVED: 'Archive',
};

export default function ChancelleryPage() {
  const [tab, setTab] = useState('registry');
  const [search, setSearch] = useState('');

  const { data: contracts = [], isLoading } = useChancelleryRegistry({ search: search || undefined });
  const { data: stats } = useChancelleryStats();

  const defaultStats = stats || {
    totalContracts: 0,
    activeContracts: 0,
    totalDisputes: 0,
    totalComplaints: 0,
    pendingReview: 0,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-7 w-7 text-cyan-400" />
          Chancellery
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Registry contractов. Access only for нотариусоin и юристов.
        </p>
      </div>

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-zinc-300 flex items-center gap-2">
        <Shield className="h-4 w-4 text-cyan-400 flex-shrink-0" />
        🔒 Chancellery — официальный registry всех contracts systemы.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total contractов', value: defaultStats.totalContracts, icon: FileText, cls: 'text-blue-400' },
          { label: 'Active', value: defaultStats.activeContracts, icon: CheckCircle, cls: 'text-emerald-400' },
          { label: 'Under Review', value: defaultStats.pendingReview, icon: Clock, cls: 'text-amber-400' },
          { label: 'Disputes', value: defaultStats.totalDisputes, icon: AlertTriangle, cls: 'text-orange-400' },
          { label: 'complaints', value: defaultStats.totalComplaints, icon: Scale, cls: 'text-rose-400' },
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Search by number, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900 border-zinc-700"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="registry" value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="registry" className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> Registry
          </TabsTrigger>
          <TabsTrigger value="disputes" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Disputes
          </TabsTrigger>
          <TabsTrigger value="complaints" className="flex items-center gap-1">
            <Scale className="h-3 w-3" /> Complaints
          </TabsTrigger>
        </TabsList>

        {/* Registry */}
        <TabsContent value="registry" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <FileText className="h-12 w-12 mx-auto opacity-30 mb-2" />
              No contracts
            </div>
          ) : (
            <Card className="bg-zinc-900/30 border-zinc-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-zinc-800">
                      <tr>
                        {['Title', 'Parties', 'Stage', 'Status', 'Date'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {contracts.map((contract: ChancelleryContract) => (
                        <tr key={contract.id} className="hover:bg-zinc-800/50 transition-colors cursor-pointer">
                          <td className="px-4 py-3 text-sm text-zinc-100">{contract.title}</td>
                          <td className="px-4 py-3 text-xs text-zinc-400">
                            {contract.parties?.map((p) => p.username).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                              STAGE_COLORS[contract.stage] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
                            }`}>
                              {STAGE_LABELS[contract.stage] || contract.stage}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${
                              contract.status === 'ACTIVE' ? 'text-emerald-400' : 'text-zinc-400'
                            }`}>
                              {contract.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">
                            {new Date(contract.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Disputes */}
        <TabsContent value="disputes" className="mt-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-zinc-300">
            Disputes on contracts. Use the Disputes section for full management.
          </div>
        </TabsContent>

        {/* Complaints */}
        <TabsContent value="complaints" className="mt-4">
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-zinc-300">
            Complaints on contracts. Use the Complaints section for full management.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
