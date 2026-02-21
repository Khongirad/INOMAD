'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Users, Crown, Building2, Vote, Scale, FileText, Gavel,
  Megaphone, Zap, Briefcase, ArrowRightLeft, CheckCircle2,
  Loader2, Activity, Plus, ChevronRight, Star, ShieldCheck,
  AlertTriangle, BarChart3, Hash, Globe,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/hooks/use-auth';

// ── Types ────────────────────────────────────────────────────────────────

interface ArbanMember {
  id: string;
  role: string;
  user: { id: string; username?: string; seatId: string; isVerified: boolean };
}

interface ArbanOrg {
  id: string;
  name: string;
  type: string;
  description?: string;
  ownershipType: string;
  powerBranch?: string;
  level: number;
  leaderId: string;
  isLeader: boolean;
  treasury?: number;
  overallRating?: number;
  _count: { members: number };
  leader: { id: string; username?: string; seatId: string; isVerified: boolean };
  members: ArbanMember[];
  parent?: { id: string; name: string; type: string; level: number };
  children?: { id: string; name: string }[];
}

// ── Branch colours ────────────────────────────────────────────────────────

const BRANCH_META: Record<string, { label: string; color: string }> = {
  EXECUTIVE:   { label: 'Исполнительная', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'     },
  LEGISLATIVE: { label: 'Законодательная', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  JUDICIAL:    { label: 'Судебная',        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'    },
  BANKING:     { label: 'Экономика',       color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'       },
};

// ── Action items ──────────────────────────────────────────────────────────

function ActionItem({ icon, label, desc, href, accent }: {
  icon: React.ReactNode; label: string; desc: string; href: string; accent: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/30 bg-slate-800/10 hover:bg-slate-800/30 hover:border-slate-600/50 transition-all group">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 px-1">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────

function MemberRow({ m, isLeader }: { m: ArbanMember; isLeader: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-700/20 bg-slate-800/10">
      <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-amber-400">
          {(m.user.username || m.user.seatId).slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-white">{m.user.username || m.user.seatId}</p>
        <p className="text-[10px] text-slate-500">{isLeader ? '👑 Лидер' : m.role}</p>
      </div>
      <div className="flex items-center gap-1">
        {m.user.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
      </div>
    </div>
  );
}

// ── No arban state ────────────────────────────────────────────────────────

function NoArban() {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Users className="h-8 w-8 text-amber-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-2">У вас нет Арбана</h2>
      <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
        Арбан — это ваша базовая гражданская ячейка из 10 человек.
        Создайте Арбан или вступите в существующий.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/organizations/create"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" /> Создать Арбан
        </Link>
        <Link href="/organizations/leaderboard"
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all">
          <Building2 className="h-4 w-4" /> Найти организацию
        </Link>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ArbanPage() {
  const { user } = useAuth();
  const [arban, setArban] = useState<ArbanOrg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ArbanOrg>('/organizations/my-arban')
      .then(d => setArban(d))
      .catch(() => setArban(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Мой Арбан</h1>
            <p className="text-xs text-slate-400">Базовая гражданская ячейка · 10 граждан</p>
          </div>
        </div>

        {!arban ? <NoArban /> : (
          <div className="space-y-6">

            {/* Identity panel */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-7 w-7 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg font-bold text-white">{arban.name}</h2>
                    {arban.isLeader && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                        👑 Вы лидер
                      </span>
                    )}
                    {arban.powerBranch && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${BRANCH_META[arban.powerBranch]?.color}`}>
                        {BRANCH_META[arban.powerBranch]?.label}
                      </span>
                    )}
                  </div>
                  {arban.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{arban.description}</p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-800/30 p-3 text-center">
                  <p className="text-lg font-bold text-amber-400">{arban._count.members}/10</p>
                  <p className="text-[10px] text-slate-500">Граждан</p>
                </div>
                <div className="rounded-xl bg-slate-800/30 p-3 text-center">
                  <p className="text-lg font-bold text-white">{arban.ownershipType}</p>
                  <p className="text-[10px] text-slate-500">Тип</p>
                </div>
                <div className="rounded-xl bg-slate-800/30 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">
                    {arban.overallRating ? arban.overallRating.toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] text-slate-500">Рейтинг</p>
                </div>
              </div>

              {/* Parent Zun */}
              {arban.parent && (
                <Link href={`/organizations/${arban.parent.id}`}
                  className="flex items-center gap-2 mt-4 pt-4 border-t border-amber-500/10 text-xs text-slate-400 hover:text-amber-400 transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Входит в: <span className="font-semibold text-slate-300">{arban.parent.name}</span></span>
                  <ChevronRight className="h-3 w-3 ml-auto" />
                </Link>
              )}
            </div>

            {/* Members */}
            <Section title={`👥 Члены Арбана (${arban.members.length}/10)`}>
              {arban.members.map(m => (
                <MemberRow key={m.id} m={m} isLeader={m.user.id === arban.leaderId} />
              ))}
              {arban.members.length < 10 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-700/40 text-xs text-slate-600">
                  <Plus className="h-3.5 w-3.5" />
                  <span>{10 - arban.members.length} свободных мест — пригласите граждан</span>
                </div>
              )}
            </Section>

            {/* Capacity bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Заполненность Арбана</span>
                <span>{arban.members.length}/10</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                  style={{ width: `${(arban.members.length / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Governance */}
            <Section title="🗳 Управление & Выборы">
              <ActionItem icon={<Vote className="h-4 w-4" />}       label="Выборы Хурала"     desc="Выборы лидера Арбана по 4 ветвям власти"     href="/elections/khural" accent="text-blue-400 bg-blue-500/10" />
              <ActionItem icon={<Activity className="h-4 w-4" />}   label="Дашборд государства" desc="Состояние власти и ЦИК"                    href="/governance"       accent="text-emerald-400 bg-emerald-500/10" />
              <ActionItem icon={<FileText className="h-4 w-4" />}   label="Парламент"         desc="Законопроекты уровня Арбана"                  href="/parliament"       accent="text-violet-400 bg-violet-500/10" />
            </Section>

            {/* Market */}
            <Section title="📈 Рынок & Экономика">
              <ActionItem icon={<Briefcase className="h-4 w-4" />}      label="Задачи / Квесты"   desc="Квесты доступные гражданам Арбана"          href="/quests"       accent="text-blue-400 bg-blue-500/10" />
              <ActionItem icon={<FileText className="h-4 w-4" />}       label="Контракты"         desc="Заключить договор с соседями или орг"        href="/chancellery"  accent="text-violet-400 bg-violet-500/10" />
              <ActionItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Биржа ALTAN"       desc="Торговля и обмен токенов"                    href="/exchange"     accent="text-emerald-400 bg-emerald-500/10" />
              <ActionItem icon={<Zap className="h-4 w-4" />}           label="Банкинг"           desc="Счёт и финансы организации"                 href="/org-banking"  accent="text-amber-400 bg-amber-500/10" />
              <ActionItem icon={<BarChart3 className="h-4 w-4" />}     label="Налоги"            desc="Налоговые декларации Арбана"                 href="/tax"          accent="text-teal-400 bg-teal-500/10" />
            </Section>

            {/* Judicial */}
            <Section title="⚖ Судебная защита">
              <ActionItem icon={<Gavel className="h-4 w-4" />}          label="Подать иск"       desc="Открыть дело на уровне Арбана"               href="/judicial"     accent="text-purple-400 bg-purple-500/10" />
              <ActionItem icon={<Scale className="h-4 w-4" />}          label="Споры"            desc="Коммерческие и личные споры"                 href="/disputes"     accent="text-blue-400 bg-blue-500/10" />
              <ActionItem icon={<AlertTriangle className="h-4 w-4" />}  label="Жалобы"           desc="Жалоба на нарушение прав"                   href="/complaints"   accent="text-orange-400 bg-orange-500/10" />
            </Section>

            {/* Forum */}
            <Section title="📣 Народная Площадь">
              <ActionItem icon={<Megaphone className="h-4 w-4" />}      label="Петиции Арбана"   desc="Открыть дебаты и подать петицию"            href="/square"              accent="text-amber-400 bg-amber-500/10" />
              <ActionItem icon={<Hash className="h-4 w-4" />}           label="Архив решений"    desc="История принятых решений"                   href="/registries/history"  accent="text-slate-400 bg-slate-500/10" />
            </Section>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href={`/organizations/${arban.id}`}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-xs font-semibold transition-all">
                <Building2 className="h-4 w-4" /> Полная страница
              </Link>
              <Link href="/organizations/leaderboard"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-700/40 bg-slate-800/10 hover:bg-slate-800/30 text-slate-400 text-xs font-medium transition-all">
                <Star className="h-4 w-4" /> Рейтинг орг.
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
