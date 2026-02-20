'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Scale, ShieldCheck, Gavel, Coins, Building2,
  ArrowRight, CheckCircle2, Clock, FileText,
  Users, Loader2, AlertTriangle, Landmark,
} from 'lucide-react';
import {
  getGovernanceStatus, getMyProvisionalRoles, getCreatorAuditLog,
  assumeRole, initiateTransfer, signTransferAct,
  type GovernanceStatus, type ProvisionalRole, type PowerBranch,
} from '@/lib/api/creator-mode';

const BRANCH_META: Record<string, { label: string; icon: React.ReactNode; color: string; roles: string[] }> = {
  LEGISLATIVE: {
    label: 'Законодательная', icon: <Scale className="h-5 w-5" />, color: 'emerald',
    roles: ['SPEAKER', 'DEPUTY_SPEAKER', 'SECRETARY_GENERAL', 'COMMITTEE_CHAIR'],
  },
  EXECUTIVE: {
    label: 'Исполнительная', icon: <Landmark className="h-5 w-5" />, color: 'blue',
    roles: ['PRESIDENT', 'VICE_PRESIDENT', 'PRIME_MINISTER', 'MINISTER'],
  },
  JUDICIAL: {
    label: 'Судебная', icon: <Gavel className="h-5 w-5" />, color: 'purple',
    roles: ['CHIEF_JUSTICE', 'ASSOCIATE_JUSTICE', 'CHIEF_PROSECUTOR'],
  },
  BANKING: {
    label: 'Экономика / ЦБ', icon: <Coins className="h-5 w-5" />, color: 'amber',
    roles: ['CB_CHAIR', 'CB_BOARD_MEMBER', 'TREASURY_CHIEF'],
  },
};

const colorMap: Record<string, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
};

const badgeMap: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400',
  blue: 'bg-blue-500/15 text-blue-400',
  purple: 'bg-purple-500/15 text-purple-400',
  amber: 'bg-amber-500/15 text-amber-400',
};

export default function CreatorDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GovernanceStatus | null>(null);
  const [myRoles, setMyRoles] = useState<ProvisionalRole[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assume role form
  const [assumeForm, setAssumeForm] = useState<{ branch: PowerBranch; roleName: string; displayName: string } | null>(null);
  const [assuming, setAssuming] = useState(false);

  // Transfer form
  const [transferForm, setTransferForm] = useState<{ roleId: string; citizenId: string; note: string } | null>(null);
  const [transferring, setTransferring] = useState(false);

  const load = async () => {
    try {
      const [s, r, a] = await Promise.all([
        getGovernanceStatus(),
        getMyProvisionalRoles().catch(() => []),
        getCreatorAuditLog(1, 10).catch(() => ({ data: [] })),
      ]);
      setStatus(s);
      setMyRoles(r);
      setAuditLog(a.data);
    } catch {
      toast.error('Ошибка загрузки панели Создателя');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAssumeRole = async () => {
    if (!assumeForm) return;
    setAssuming(true);
    try {
      await assumeRole({
        branch: assumeForm.branch,
        roleName: assumeForm.roleName,
        roleDisplayName: assumeForm.displayName || undefined,
      });
      toast.success(`Вы заняли должность ${assumeForm.roleName} в ветви ${assumeForm.branch}`);
      setAssumeForm(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    } finally {
      setAssuming(false);
    }
  };

  const handleInitiateTransfer = async () => {
    if (!transferForm) return;
    setTransferring(true);
    try {
      const result = await initiateTransfer({
        provisionalRoleId: transferForm.roleId,
        transferredToId: transferForm.citizenId,
        transferNote: transferForm.note || undefined,
      });
      toast.success('Передача инициирована. Подпишите Акт для завершения.');
      setTransferForm(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    } finally {
      setTransferring(false);
    }
  };

  const handleSignAct = async (roleId: string) => {
    try {
      await signTransferAct(roleId);
      toast.success('⚡ Акт передачи власти подписан! Передача завершена.');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const activeRoles = myRoles.filter(r => r.status === 'ACTIVE');
  const pendingTransfers = myRoles.filter(r => r.status === 'ACTIVE' && r.transferredToId && !r.endedAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-red-400" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Creator Panel</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Панель Создателя</h1>
            <p className="text-slate-400 text-sm mt-1">Временное управление ветвями власти до избрания граждан</p>
          </div>
          <button
            onClick={() => router.push('/organizations/create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            <Building2 className="h-4 w-4" />
            Создать организацию
          </button>
        </div>

        {/* Formation banner */}
        {status?.isFormationPeriod && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300 text-sm">Период формирования государства</p>
              <p className="text-amber-400/80 text-xs mt-0.5">Государство формируется — некоторые ветви власти под временным управлением Создателя</p>
            </div>
          </div>
        )}

        {/* 4 Branches grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Object.entries(BRANCH_META).map(([branch, meta]) => {
            const branchStatus = status?.branches.find(b => b.branch === branch);
            const provisionalHere = activeRoles.filter(r => r.branch === branch);
            const color = meta.color;

            return (
              <div key={branch} className={`rounded-2xl border p-5 ${colorMap[color]}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${badgeMap[color]}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{meta.label}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        branchStatus?.isProvisional ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {branchStatus?.isProvisional ? '🔴 PROVISIONAL' : '✅ FORMED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active provisional roles for this branch */}
                {provisionalHere.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {provisionalHere.map(role => (
                      <div key={role.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{role.roleDisplayName || role.roleName}</p>
                            <p className="text-xs text-slate-400">С {new Date(role.startedAt).toLocaleDateString('ru-RU')}</p>
                          </div>
                          {role.transferredToId ? (
                            <button
                              onClick={() => handleSignAct(role.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-all"
                            >
                              Подписать Акт ⚡
                            </button>
                          ) : (
                            <button
                              onClick={() => setTransferForm({ roleId: role.id, citizenId: '', note: '' })}
                              className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs hover:bg-slate-700 transition-all"
                            >
                              Передать →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mb-3">Нет активных должностей в этой ветви</p>
                )}

                {/* Assume role button */}
                <button
                  onClick={() => setAssumeForm({ branch: branch as PowerBranch, roleName: meta.roles[0], displayName: '' })}
                  className="w-full py-2 rounded-xl border border-slate-600/40 text-xs text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700/30 transition-all"
                >
                  + Занять должность
                </button>
              </div>
            );
          })}
        </div>

        {/* Recent audit log */}
        {auditLog.length > 0 && (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-slate-400" />
              <h3 className="font-semibold text-white text-sm">Последние действия (публичный журнал)</h3>
            </div>
            <div className="space-y-2">
              {auditLog.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center gap-3 text-xs text-slate-400 py-1.5 border-b border-slate-700/30 last:border-0">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-slate-300 font-medium">[{log.provisionalRole?.roleName}]</span>
                  <span>{log.action}</span>
                  {log.targetId && <span className="text-slate-500">→ {log.targetType}:{log.targetId.slice(0, 8)}…</span>}
                  <span className="ml-auto">{new Date(log.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assume role modal */}
        {assumeForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-4">Занять должность</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Ветвь власти</label>
                  <select
                    value={assumeForm.branch}
                    onChange={e => setAssumeForm(f => f && ({ ...f, branch: e.target.value as PowerBranch }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500/60"
                  >
                    {Object.entries(BRANCH_META).map(([b, m]) => (
                      <option key={b} value={b}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Должность</label>
                  <select
                    value={assumeForm.roleName}
                    onChange={e => setAssumeForm(f => f && ({ ...f, roleName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500/60"
                  >
                    {(BRANCH_META[assumeForm.branch]?.roles || []).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">
                    Отображаемое название (право именования)
                  </label>
                  <input
                    type="text"
                    value={assumeForm.displayName}
                    onChange={e => setAssumeForm(f => f && ({ ...f, displayName: e.target.value }))}
                    placeholder="напр. Президент Сибирской Конфедерации"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setAssumeForm(null)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                  Отмена
                </button>
                <button
                  onClick={handleAssumeRole}
                  disabled={assuming}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {assuming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Занять
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer modal */}
        {transferForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-1">Передача власти</h3>
              <p className="text-xs text-slate-400 mb-4">Создатель первым инициирует передачу. Гражданин должен быть верифицирован.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">ID гражданина (userId)</label>
                  <input
                    type="text"
                    value={transferForm.citizenId}
                    onChange={e => setTransferForm(f => f && ({ ...f, citizenId: e.target.value }))}
                    placeholder="uuid гражданина..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Публичное обращение (необязательно)</label>
                  <textarea
                    value={transferForm.note}
                    onChange={e => setTransferForm(f => f && ({ ...f, note: e.target.value }))}
                    rows={3}
                    placeholder="Слова при передаче власти народу..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setTransferForm(null)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all">
                  Отмена
                </button>
                <button
                  onClick={handleInitiateTransfer}
                  disabled={!transferForm.citizenId || transferring}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {transferring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Инициировать
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
