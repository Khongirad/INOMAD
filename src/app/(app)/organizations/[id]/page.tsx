'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Building2, Users, Crown, Star, ArrowLeft,
  Briefcase, Scale, Vote, Zap, Megaphone,
  FileText, Loader2, Activity, Settings,
  CheckCircle2, AlertTriangle, ChevronRight,
  Plus, Gavel, ArrowRightLeft, ShieldCheck,
  BarChart3, Globe, Hash,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ────────────────────────────────────────────────────────────────

interface OrgDetail {
  id: string;
  name: string;
  type: string;
  description?: string;
  ownershipType: string;   // PRIVATE | PUBLIC | MIXED | COOPERATIVE
  powerBranch?: string;    // EXECUTIVE | LEGISLATIVE | JUDICIAL | BANKING
  level: number;           // 1=Arban,10=Zun,100=Myangan,1000=Tumen
  republic?: string;
  leader?: { id: string; username?: string; seatId: string; isVerified: boolean };
  members?: { id: string; userId: string; role: string; user: { username?: string; seatId: string } }[];
  parent?: { id: string; name: string; type: string };
  children?: { id: string; name: string; type: string; level: number }[];
  createdAt: string;
  rating?: number;
  ratingCount?: number;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Арбан (10)', 10: 'Зун (100)', 100: 'Мьянган (1000)', 1000: 'Тумэн (10000)',
};

const BRANCH_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  EXECUTIVE:   { label: 'Исполнительная', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',   icon: <Building2 className="h-4 w-4" /> },
  LEGISLATIVE: { label: 'Законодательная', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <FileText className="h-4 w-4" /> },
  JUDICIAL:    { label: 'Судебная',         color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',   icon: <Scale className="h-4 w-4" /> },
  BANKING:     { label: 'Экономика/ЦБ',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',      icon: <Zap className="h-4 w-4" /> },
};

const OWNERSHIP_BADGE: Record<string, string> = {
  PRIVATE:     'text-violet-400 bg-violet-500/10 border-violet-500/20',
  PUBLIC:      'text-blue-400 bg-blue-500/10 border-blue-500/20',
  MIXED:       'text-teal-400 bg-teal-500/10 border-teal-500/20',
  COOPERATIVE: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const TABS = [
  { key: 'overview',    label: '🏛 Обзор'       },
  { key: 'market',      label: '📈 Рынок'      },
  { key: 'governance',  label: '🗳 Управление' },
  { key: 'judicial',    label: '⚖ Суд'         },
  { key: 'forum',       label: '📣 Площадь'    },
  { key: 'members',     label: '👥 Члены'      },
];

// ── Mini components ───────────────────────────────────────────────────────

function ActionCard({ icon, title, desc, href, color }: {
  icon: React.ReactNode; title: string; desc: string; href: string; color: string;
}) {
  return (
    <Link href={href} className={`flex items-start gap-3 p-4 rounded-2xl border ${color} hover:opacity-80 transition-all group`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 ml-auto mt-0.5 group-hover:text-white transition-colors" />
    </Link>
  );
}

// ── Tabs content ──────────────────────────────────────────────────────────

function OverviewTab({ org }: { org: OrgDetail }) {
  const branch = org.powerBranch ? BRANCH_META[org.powerBranch] : null;
  return (
    <div className="space-y-5">
      {/* Identity card */}
      <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/20 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${OWNERSHIP_BADGE[org.ownershipType] ?? ''}`}>
                {org.ownershipType}
              </span>
              {branch && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${branch.color}`}>
                  {branch.icon} {branch.label}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {LEVEL_LABELS[org.level] ?? `Уровень ${org.level}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{org.type.replace(/_/g, ' ')} · {org.republic}</p>
          </div>
        </div>
        {org.description && <p className="text-sm text-slate-400 leading-relaxed">{org.description}</p>}
        {org.leader && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/30 text-xs">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-300">Лидер: {org.leader.username || org.leader.seatId}</span>
            {org.leader.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
          </div>
        )}
      </div>

      {/* Parent / children */}
      {(org.parent || (org.children && org.children.length > 0)) && (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Иерархия</h3>
          {org.parent && (
            <Link href={`/organizations/${org.parent.id}`} className="flex items-center gap-2 p-2 rounded-xl border border-slate-700/30 hover:border-slate-600 text-xs text-slate-300 mb-2">
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="flex-1">{org.parent.name} <span className="text-slate-600">({org.parent.type})</span></span>
              <span className="text-slate-600">родительская</span>
            </Link>
          )}
          {org.children?.map(c => (
            <Link key={c.id} href={`/organizations/${c.id}`} className="flex items-center gap-2 p-2 rounded-xl border border-slate-700/30 hover:border-slate-600 text-xs text-slate-300 mb-1">
              <Building2 className="h-3.5 w-3.5 text-slate-500 ml-2" />
              <span className="flex-1">{c.name} <span className="text-slate-600">({LEVEL_LABELS[c.level] ?? c.type})</span></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketTab({ org }: { org: OrgDetail }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">
        Рыночные инструменты организации — задачи, контракты, банкинг, налоги
      </p>
      <ActionCard
        icon={<Briefcase className="h-4 w-4 text-blue-400" />}
        title="Задачи и Квесты" desc="Разместить задачи, нанять граждан, выплатить ALTAN"
        href="/quests" color="border-blue-500/20 bg-blue-500/5"
      />
      <ActionCard
        icon={<FileText className="h-4 w-4 text-violet-400" />}
        title="Контракты и Документы" desc="Подписать договоры, нотариат, реестр сделок"
        href="/chancellery" color="border-violet-500/20 bg-violet-500/5"
      />
      <ActionCard
        icon={<ArrowRightLeft className="h-4 w-4 text-emerald-400" />}
        title="Биржа ALTAN" desc="Торговля токенами, обменные операции"
        href="/exchange" color="border-emerald-500/20 bg-emerald-500/5"
      />
      <ActionCard
        icon={<Zap className="h-4 w-4 text-amber-400" />}
        title="Банковский счёт" desc="Баланс, транзакции, кредиты от ЦБ"
        href="/org-banking" color="border-amber-500/20 bg-amber-500/5"
      />
      <ActionCard
        icon={<BarChart3 className="h-4 w-4 text-teal-400" />}
        title="Налоги" desc="Подача деклараций, расчёт налоговой базы"
        href="/tax" color="border-teal-500/20 bg-teal-500/5"
      />
      <ActionCard
        icon={<Star className="h-4 w-4 text-orange-400" />}
        title="Рейтинг организации" desc="Репутационный рейтинг на открытом рынке"
        href={`/organizations/${org.id}`}
        color="border-orange-500/20 bg-orange-500/5"
      />
    </div>
  );
}

function GovernanceTab({ org }: { org: OrgDetail }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">
        Взаимодействие с 4 ветвями власти — выборы, законодательство, петиции
      </p>
      <ActionCard
        icon={<Vote className="h-4 w-4 text-blue-400" />}
        title="Выборы Хурала" desc={`Кандидаты из этой организации (ветвь: ${org.powerBranch || 'не назначена'})`}
        href="/elections/khural" color="border-blue-500/20 bg-blue-500/5"
      />
      <ActionCard
        icon={<Activity className="h-4 w-4 text-emerald-400" />}
        title="Дашборд государства" desc="Статус всех 4 ветвей, активные выборы, ЦИК"
        href="/governance" color="border-emerald-500/20 bg-emerald-500/5"
      />
      <ActionCard
        icon={<FileText className="h-4 w-4 text-purple-400" />}
        title="Парламент / Хурал" desc="Законопроекты, голосования, комитеты"
        href="/parliament" color="border-purple-500/20 bg-purple-500/5"
      />
      <ActionCard
        icon={<Globe className="h-4 w-4 text-amber-400" />}
        title="Государственная карта" desc="Иерархия территорий и органов власти"
        href="/hierarchy" color="border-amber-500/20 bg-amber-500/5"
      />
      <ActionCard
        icon={<Briefcase className="h-4 w-4 text-teal-400" />}
        title="Госзаказы" desc="Тендеры от государственных органов"
        href="/quests" color="border-teal-500/20 bg-teal-500/5"
      />
    </div>
  );
}

function JudicialTab({ org }: { org: OrgDetail }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">
        Судебные разбирательства — подать иск против организации, защита прав
      </p>
      <ActionCard
        icon={<Gavel className="h-4 w-4 text-purple-400" />}
        title="Подать иск" desc={`Открыть судебное дело против ${org.name} или от её имени`}
        href="/judicial" color="border-purple-500/20 bg-purple-500/5"
      />
      <ActionCard
        icon={<Scale className="h-4 w-4 text-blue-400" />}
        title="Активные дела" desc="Просмотр всех судебных дел, в которых участвует организация"
        href="/judicial" color="border-blue-500/20 bg-blue-500/5"
      />
      <ActionCard
        icon={<FileText className="h-4 w-4 text-emerald-400" />}
        title="Жалобы" desc="Жалобы на действия организации или её лидера"
        href="/complaints" color="border-emerald-500/20 bg-emerald-500/5"
      />
      <ActionCard
        icon={<ShieldCheck className="h-4 w-4 text-amber-400" />}
        title="Споры" desc="Разрешение коммерческих и трудовых споров"
        href="/disputes" color="border-amber-500/20 bg-amber-500/5"
      />
    </div>
  );
}

function ForumTab({ org }: { org: OrgDetail }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 mb-4">
        Голос организации на Народной Площади, петиции и дебаты
      </p>
      <ActionCard
        icon={<Megaphone className="h-4 w-4 text-amber-400" />}
        title="Народная Площадь" desc="Открыть дебаты, подать петицию от имени организации"
        href="/square" color="border-amber-500/20 bg-amber-500/5"
      />
      <ActionCard
        icon={<Vote className="h-4 w-4 text-emerald-400" />}
        title="Голосования" desc="Активные голосования на уровне организации"
        href="/square" color="border-emerald-500/20 bg-emerald-500/5"
      />
      <ActionCard
        icon={<Hash className="h-4 w-4 text-blue-400" />}
        title="Архив решений" desc="История принятых петиций и решений"
        href="/registries/history" color="border-blue-500/20 bg-blue-500/5"
      />
    </div>
  );
}

function MembersTab({ org }: { org: OrgDetail }) {
  const members = org.members ?? [];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">{members.length} участников</p>
      </div>
      {members.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-700/40 rounded-2xl">
          <Users className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Нет членов</p>
        </div>
      ) : (
        members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/30 bg-slate-800/10">
            <div className="h-8 w-8 rounded-lg bg-slate-700/40 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">{m.user.username || m.user.seatId}</p>
              <p className="text-[10px] text-slate-500">{m.role}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function OrganizationDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;
  const [org, setOrg]       = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<OrgDetail>(`/organizations/${id}`);
      setOrg(data);
    } catch {
      toast.error('Ошибка загрузки организации');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
  if (!org) return null;

  const branch = org.powerBranch ? BRANCH_META[org.powerBranch] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Back + header */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Назад
        </button>

        {/* Title bar */}
        <div className="flex items-start gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-7 w-7 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{org.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${OWNERSHIP_BADGE[org.ownershipType] ?? ''}`}>
                {org.ownershipType}
              </span>
              {branch && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${branch.color}`}>
                  {branch.label}
                </span>
              )}
              <span className="text-[10px] text-slate-500">
                {LEVEL_LABELS[org.level] ?? `Уровень ${org.level}`}
              </span>
              {org.rating !== undefined && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" /> {org.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t.key
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 border border-transparent hover:text-white hover:border-slate-700/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview'   && <OverviewTab    org={org} />}
        {tab === 'market'     && <MarketTab      org={org} />}
        {tab === 'governance' && <GovernanceTab  org={org} />}
        {tab === 'judicial'   && <JudicialTab    org={org} />}
        {tab === 'forum'      && <ForumTab       org={org} />}
        {tab === 'members'    && <MembersTab     org={org} />}
      </div>
    </div>
  );
}
