'use client';

import React, { useState } from 'react';
import {
  Handshake, Scale, AlertTriangle, MessageSquare,
  CheckCircle, FileText, Clock, ArrowUpRight, Plus, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useDisputes,
  useOpenDispute,
  useSettleDispute,
  useEscalateDispute,
} from '@/lib/api';
import type { Dispute, DisputeStatus, DisputeSourceType } from '@/lib/types/models';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPENED: { label: 'Opened', color: 'text-blue-400' },
  NEGOTIATING: { label: 'Negotiations', color: 'text-amber-400' },
  SETTLED: { label: 'Settled', color: 'text-emerald-400' },
  COMPLAINT_FILED: { label: 'Submitted complaint', color: 'text-rose-400' },
  COURT_FILED: { label: 'Referred to Court', color: 'text-purple-400' },
};

const SOURCE_LABELS: Record<string, string> = {
  CONTRACT: 'Contract',
  QUEST: 'Task',
  WORK_ACT: 'Work Act',
};

export default function DisputesPage() {
  const [tab, setTab] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    partyBId: '',
    sourceType: 'CONTRACT' as DisputeSourceType,
    sourceId: '',
    title: '',
    description: '',
  });

  const { data: disputes = [], isLoading } = useDisputes();
  const openMutation = useOpenDispute();
  const settleMutation = useSettleDispute();
  const escalateMutation = useEscalateDispute();

  const stats = {
    total: disputes.length,
    open: disputes.filter((d: Dispute) => ['OPENED', 'NEGOTIATING'].includes(d.status)).length,
    settled: disputes.filter((d: Dispute) => d.status === 'SETTLED').length,
    escalated: disputes.filter((d: Dispute) =>
      ['COMPLAINT_FILED', 'COURT_FILED'].includes(d.status),
    ).length,
  };

  const handleOpen = async () => {
    try {
      await openMutation.mutateAsync(form);
      toast.success('Dispute открыт');
      setDialogOpen(false);
      setForm({ partyBId: '', sourceType: 'CONTRACT', sourceId: '', title: '', description: '' });
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const handleSettle = async (id: string) => {
    const resolution = prompt('Settlement description:');
    if (!resolution) return;
    try {
      await settleMutation.mutateAsync({ id, resolution });
      toast.success('Dispute settled');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEscalate = async (id: string, target: 'complaint' | 'court') => {
    try {
      await escalateMutation.mutateAsync({ id, target });
      toast.success(target === 'complaint' ? 'Complaint submitted' : 'Referred to Court');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredDisputes =
    tab === 'all'
      ? disputes
      : tab === 'open'
        ? disputes.filter((d: Dispute) => ['OPENED', 'NEGOTIATING'].includes(d.status))
        : disputes.filter((d: Dispute) => d.status === 'SETTLED');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Handshake className="h-7 w-7 text-blue-400" />
          Disputes
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Negotiations по disputeным вопросам. Each dispute is linked to a contract, task, or work act.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Disputes', value: stats.total, icon: FileText, cls: 'text-blue-400' },
          { label: 'Openedых', value: stats.open, icon: Clock, cls: 'text-amber-400' },
          { label: 'Settledо', value: stats.settled, icon: CheckCircle, cls: 'text-emerald-400' },
          { label: 'Escalated', value: stats.escalated, icon: ArrowUpRight, cls: 'text-rose-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-zinc-500">{s.label}</p>
              </div>
              <s.icon className={`h-5 w-5 ${s.cls} opacity-40`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions + info */}
      <div className="flex items-center gap-3">
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Open a Dispute
        </Button>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-zinc-300">
        💡 A dispute is the first step before a complaint. Parties try to resolve the issue themselves.
        If not resolved — you can file a complaint or go to court directly.
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="settled">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No disputes
            </div>
          ) : (
            filteredDisputes.map((dispute: Dispute) => {
              const status = STATUS_LABELS[dispute.status] || {
                label: dispute.status,
                color: 'text-zinc-400',
              };
              return (
                <Card
                  key={dispute.id}
                  className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 transition-colors"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Title + status */}
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-zinc-100">{dispute.title}</h3>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-400">{dispute.description}</p>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2 items-center text-xs">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-300 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {SOURCE_LABELS[dispute.sourceType] || dispute.sourceType}
                      </span>
                      <span className="text-zinc-500">
                        {dispute.partyA?.username} ↔ {dispute.partyB?.username}
                      </span>
                      <span className="text-zinc-600">
                        {new Date(dispute.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    {/* Actions for open disputes */}
                    {['OPENED', 'NEGOTIATING'].includes(dispute.status) && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" /> Negotiations
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-800 text-emerald-400 text-xs"
                          onClick={() => handleSettle(dispute.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Settle
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-800 text-amber-400 text-xs"
                          onClick={() => handleEscalate(dispute.id, 'complaint')}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" /> Complaint
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-800 text-rose-400 text-xs"
                          onClick={() => handleEscalate(dispute.id, 'court')}
                        >
                          <Scale className="h-3 w-3 mr-1" /> To Court
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Open Dispute Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-700">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-zinc-100">Open a Dispute</h2>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-zinc-300">
                ⚠️ A dispute is always linked to a specific contract, task, or work act.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Source Type</label>
                  <select
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100"
                    value={form.sourceType}
                    onChange={(e) => setForm({ ...form, sourceType: e.target.value as DisputeSourceType })}
                  >
                    <option value="CONTRACT">Contract</option>
                    <option value="QUEST">Task</option>
                    <option value="WORK_ACT">Work Act</option>
                  </select>
                </div>
                <Input
                  placeholder="Document ID"
                  className="bg-zinc-800 border-zinc-700"
                  value={form.sourceId}
                  onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
                />
                <Input
                  placeholder="Second party ID"
                  className="bg-zinc-800 border-zinc-700"
                  value={form.partyBId}
                  onChange={(e) => setForm({ ...form, partyBId: e.target.value })}
                />
                <Input
                  placeholder="Topic dispute"
                  className="bg-zinc-800 border-zinc-700"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <textarea
                  placeholder="Description"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-zinc-700" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleOpen}
                  disabled={openMutation.isPending}
                >
                  {openMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Open a Dispute
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
