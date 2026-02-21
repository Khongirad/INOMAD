'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Scale, Zap, Building2, Users, ShieldCheck, Vote,
  Megaphone, ArrowUpCircle, TrendingUp, Crown, Hash,
  AlertTriangle, CheckCircle2, Clock, RefreshCw,
  ChevronRight, Globe, FileText, Activity,
} from 'lucide-react';
import { getGovernanceSummary, type GovernanceSummary, type BranchStatus } from '@/lib/api/governance';

// ── Meta ──────────────────────────────────────────────────────────────────

const BRANCH_META: Record<string, {
  label: string; icon: React.ReactNode; gradient: string; borderColor: string;
}> = {
  LEGISLATIVE: { label: 'Законодательная',  icon: <Scale className="h-5 w-5" />,    gradient: 'from-emerald-500/15 to-emerald-500/5', borderColor: 'border-emerald-500/30' },
  EXECUTIVE:   { label: 'Исполнительная',   icon: <Building2 className="h-5 w-5" />, gradient: 'from-blue-500/15 to-blue-500/5',    borderColor: 'border-blue-500/30'    },
  JUDICIAL:    { label: 'Судебная',          icon: <Scale className="h-5 w-5" />,    gradient: 'from-purple-500/15 to-purple-500/5', borderColor: 'border-purple-500/30' },
  BANKING:     { label: 'Экономика / ЦБ',   icon: <Zap className="h-5 w-5" />,      gradient: 'from-amber-500/15 to-amber-500/5',   borderColor: 'border-amber-500/30'   },
};

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Семья', LEVEL_10: 'Арбан', LEVEL_100: 'Зун',
  LEVEL_1000: 'Мьянган', LEVEL_10000: 'Тумэн', REPUBLIC: 'Республика', CONFEDERATION: 'Хурал',
};

const LADDER = ['LEVEL_1','LEVEL_10','LEVEL_100','LEVEL_1000','LEVEL_10000','REPUBLIC','CONFEDERATION'];

// ── Sub-components ─────────────────────────────────────────────────────────

function BranchCard({ branch }: { branch: BranchStatus }) {
  const meta = BRANCH_META[branch.branch];
  const isFormed = branch.status === 'FORMED';

  return (
    <div className={`relative rounded-2xl border ${meta.borderColor} bg-gradient-to-br ${meta.gradient} p-5 overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-20 ${
        isFormed ? 'bg-emerald-400' : 'bg-amber-400'
      }`} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`p-2 rounded-xl ${isFormed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {meta.icon}
          </span>
          <div>
            <p className="text-xs text-slate-400 font-medium">{meta.label}</p>
            <p className={`text-sm font-bold ${isFormed ? 'text-emerald-400' : 'text-amber-300'}`}>
              {isFormed ? '✅ Сформирована' : '⚡ Временно (Создатель)'}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
          isFormed
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        }`}>
          {isFormed ? 'FORMED' : 'PROVISIONAL'}
        </span>
      </div>

      {!isFormed && branch.provisionalRoles.length > 0 && (
        <div className="space-y-1">
          {branch.provisionalRoles.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />
              <span>{r.roleDisplayName || r.roleName}</span>
              <span className="text-slate-600 ml-auto">
                {new Date(r.startedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          ))}
        </div>
      )}
      {isFormed && (
        <p className="text-xs text-emerald-400/70 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {branch.transferredRoles} ролей передано законным образом
        </p>
      )}
    </div>
  );
}

function ElectionPill({ election }: { election: GovernanceSummary['featuredElections'][0] }) {
  const fromLabel = LEVEL_LABELS[election.fromLevel] ?? election.fromLevel;
  const toLabel   = LEVEL_LABELS[election.toLevel]   ?? election.toLevel;
  const isVoting  = election.status === 'VOTING';
  const timeLeft  = Math.max(0, new Date(election.votingEnd).getTime() - Date.now());
  const hours     = Math.floor(timeLeft / 3600000);
  const mins      = Math.floor((timeLeft % 3600000) / 60000);

  const BRANCH_COLOR: Record<string, string> = {
    EXECUTIVE:   'text-blue-400   bg-blue-500/10   border-blue-500/20',
    LEGISLATIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    JUDICIAL:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
    BANKING:     'text-amber-400  bg-amber-500/10  border-amber-500/20',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40 transition-all group">
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${BRANCH_COLOR[election.branch]}`}>
        {election.branch.slice(0, 3)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {fromLabel} → {toLabel} · {election.scopeName}
        </p>
        <p className="text-[10px] text-slate-500">{election.ballotCount} голосов</p>
      </div>
      {isVoting && (
        <span className="text-[10px] text-amber-400 font-mono flex-shrink-0">
          <Clock className="h-3 w-3 inline mr-0.5" />
          {hours}ч {mins}м
        </span>
      )}
      <Link href="/elections/khural" className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </Link>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="p-4 rounded-2xl border border-slate-700/40 bg-slate-800/20">
      <div className={`inline-flex p-2 rounded-xl mb-3 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString('ru-RU') : value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function GovernanceDashboard() {
  const [data, setData] = useState<GovernanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const summary = await getGovernanceSummary();
      setData(summary);
      setLastUpdated(new Date());
    } catch {
      if (!silent) toast.error('Ошибка загрузки данных государства');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-12 w-12 text-slate-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Загрузка состояния государства…</p>
        </div>
      </div>
    );
  }

  // Ladder progress: how many rungs have active elections
  const ladderProgress = LADDER.slice(0, -1).map((from, i) => {
    const to  = LADDER[i + 1];
    const key = `${from}→${to}`;
    return { from, to, count: data.electionsByRung[key] ?? 0 };
  });
  const activeRungs = ladderProgress.filter(r => r.count > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Formation banner */}
      {data.isFormationPeriod && (
        <div className="bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-orange-600/20 border-b border-amber-500/30 px-4 py-3 text-center">
          <p className="text-amber-300 text-sm font-medium">{data.banner}</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-blue-400" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                Государственный дашборд
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Сибирская Конфедерация</h1>
            <p className="text-slate-400 text-sm mt-1">
              Публичное состояние всех ветвей власти в реальном времени
            </p>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600 text-xs transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {lastUpdated ? lastUpdated.toLocaleTimeString('ru-RU') : '—'}
          </button>
        </div>

        {/* Population stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={<Users className="h-4 w-4 text-blue-400" />}
            label="Граждан"
            value={data.stats.totalCitizens}
            color="bg-blue-500/10"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            label="Верифицированных"
            value={data.stats.verifiedCitizens}
            sub={`${data.stats.verificationRate}% от всех`}
            color="bg-emerald-500/10"
          />
          <StatCard
            icon={<Building2 className="h-4 w-4 text-purple-400" />}
            label="Организаций"
            value={data.stats.activeOrganizations}
            color="bg-purple-500/10"
          />
          <StatCard
            icon={<Vote className="h-4 w-4 text-amber-400" />}
            label="Активных выборов"
            value={data.activeElections}
            sub={`${activeRungs}/6 ступеней охвачено`}
            color="bg-amber-500/10"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left (2/3): branches + elections + petitions */}
          <div className="lg:col-span-2 space-y-6">

            {/* 4 branches */}
            <section>
              <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" /> Ветви власти
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.branches.map(b => <BranchCard key={b.branch} branch={b} />)}
              </div>
            </section>

            {/* Election ladder progress */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Vote className="h-4 w-4 text-slate-400" /> Лестница выборов
                </h2>
                <Link href="/elections/khural" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Вся таблица <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {/* Ladder visual */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                {ladderProgress.map((rung, i) => (
                  <div key={rung.from} className="flex items-center gap-1 flex-shrink-0">
                    <div className={`px-2 py-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      rung.count > 0
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                        : 'border-slate-700/30 text-slate-600'
                    }`}>
                      <p>{LEVEL_LABELS[rung.from]}</p>
                      {rung.count > 0 && <p className="text-[9px] text-center text-blue-400">{rung.count} вет.</p>}
                    </div>
                    <ChevronRight className="h-3 w-3 text-slate-700" />
                  </div>
                ))}
                <div className="px-2 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px] font-medium flex-shrink-0">
                  Хурал
                </div>
              </div>
              {/* Featured elections */}
              <div className="space-y-2">
                {data.featuredElections.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-700/40 rounded-xl">
                    <Vote className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">Выборов пока нет</p>
                  </div>
                ) : (
                  data.featuredElections.map(e => <ElectionPill key={e.id} election={e} />)
                )}
              </div>
            </section>

            {/* Hot petitions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-amber-400" /> Горячие петиции
                  {data.escalatedPosts > 0 && (
                    <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                      {data.escalatedPosts} эскалировано
                    </span>
                  )}
                  {data.legislativePosts > 0 && (
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                      {data.legislativePosts} в Хурале
                    </span>
                  )}
                </h2>
                <Link href="/square" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  Площадь <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {data.hotPetitions.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-700/40 rounded-xl">
                    <Megaphone className="h-6 w-6 text-slate-600 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">Активных петиций нет</p>
                  </div>
                ) : (
                  data.hotPetitions.map(p => {
                    const pct = p.requiredSupport > 0
                      ? Math.min(100, Math.round((p.supportCount / p.requiredSupport) * 100))
                      : 0;
                    return (
                      <div key={p.id} className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-white line-clamp-1 flex-1">{p.title}</p>
                          <span className="text-[10px] text-amber-400 ml-2 flex-shrink-0">
                            {LEVEL_LABELS[p.level]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-700/60">
                            <div className="h-1.5 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {p.supportCount}/{p.requiredSupport}
                          </span>
                          {p.status === 'ESCALATED' && (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* CIK panel */}
            <section>
              <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" /> Центральный ЦИК
              </h2>
              {data.cik ? (
                <div className={`p-4 rounded-2xl border ${
                  data.cik.type === 'PROVISIONAL' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'
                }`}>
                  <p className={`text-xs font-bold mb-2 ${data.cik.type === 'PROVISIONAL' ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {data.cik.type === 'PROVISIONAL' ? '⚡ Временный ЦИК' : '🏛 Постоянный ЦИК'}
                  </p>
                  {data.cik.mandate && (
                    <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{data.cik.mandate}</p>
                  )}
                  <div className="space-y-1.5">
                    {data.cik.members.slice(0, 5).map((m: any) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        {m.role === 'CHAIR' && <Crown className="h-3 w-3 text-yellow-400" />}
                        <span className="text-slate-300">{m.user.username || m.user.seatId}</span>
                        {m.user.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto" />}
                      </div>
                    ))}
                  </div>
                  <Link href="/elections/khural" className="mt-3 flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                    Перейти к выборам <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-slate-700/40 bg-slate-800/10 text-center">
                  <AlertTriangle className="h-5 w-5 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">ЦИК не назначен</p>
                  <p className="text-[10px] text-slate-600 mt-1">Ожидание назначения Создателем</p>
                </div>
              )}
            </section>

            {/* Audit log */}
            {data.recentActions.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" /> Журнал действий
                </h2>
                <div className="space-y-2">
                  {data.recentActions.map((a: any) => (
                    <div key={a.id} className="p-2.5 rounded-xl border border-slate-700/30 bg-slate-800/10">
                      <p className="text-[10px] font-semibold text-slate-300">
                        {a.action.replace(/_/g, ' ')}
                      </p>
                      {a.provisionalRole && (
                        <p className="text-[9px] text-slate-500">
                          {a.provisionalRole.branch} · {a.provisionalRole.roleDisplayName || a.provisionalRole.roleName}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-600 mt-0.5">
                        {new Date(a.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  ))}
                </div>
                <Link href="/creator/governance-status" className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 hover:text-white">
                  Полный журнал <ChevronRight className="h-3 w-3" />
                </Link>
              </section>
            )}

            {/* Quick links */}
            <section>
              <h2 className="text-sm font-bold text-slate-300 mb-3">Быстрые ссылки</h2>
              <div className="space-y-1.5">
                {[
                  { href: '/square',           icon: <Megaphone className="h-3.5 w-3.5" />, label: 'Народная площадь' },
                  { href: '/elections/khural', icon: <Vote className="h-3.5 w-3.5" />,      label: 'Выборы в Хурал' },
                  { href: '/organizations',    icon: <Building2 className="h-3.5 w-3.5" />, label: 'Организации' },
                  { href: '/hierarchy',        icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Иерархия' },
                ].map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-700/40 text-slate-300 hover:bg-slate-800/40 hover:text-white hover:border-slate-600/60 text-xs transition-all"
                  >
                    <span className="text-slate-500">{l.icon}</span>
                    {l.label}
                    <ChevronRight className="h-3 w-3 text-slate-600 ml-auto" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
