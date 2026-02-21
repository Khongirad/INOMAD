'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Users, Crown, Building2, Vote, Scale, FileText, Gavel,
  Megaphone, Zap, Briefcase, ArrowRightLeft, CheckCircle2,
  Loader2, Activity, Plus, ChevronRight, Star, AlertTriangle,
  BarChart3, Globe, Shield, TreePine, Lock, Unlock, ArrowUp,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ────────────────────────────────────────────────────────────────

interface OrgMember {
  id: string; role: string;
  user: { id: string; username?: string; seatId: string; isVerified: boolean };
}

interface OrgNode {
  id: string; name: string; type: string; level: number;
  ownershipType?: string; powerBranch?: string;
  leaderId?: string; isLeader?: boolean;
  treasury?: number; overallRating?: number;
  _count?: { members: number };
  leader?: { id: string; username?: string; seatId: string; isVerified: boolean };
  members?: OrgMember[];
  parent?: { id: string; name: string; type: string; level: number };
  children?: { id: string; name: string; type: string; level: number }[];
}

// ── Level meta ────────────────────────────────────────────────────────────

const LEVELS = [
  {
    n: 1, key: 'arban', label: 'Арбан', sub: '10 граждан',
    color: 'amber',
    desc: 'Базовая ячейка гражданина. 10 человек — семьи, соседи. Самостоятельная или входит в Зун.',
    icon: <Users className="h-5 w-5" />,
    powers: ['Выборы лидера Арбана', 'Малый бизнес, кооператив', 'Суд на уровне общины', 'Петиции соседей'],
  },
  {
    n: 2, key: 'zun', label: 'Зун', sub: '10 Арбанов · 100 граждан',
    color: 'orange',
    desc: '10 Арбанов объединяются в Зун — округ. Лидеры Арбанов избирают власть Зуна по 4 ветвям.',
    icon: <Building2 className="h-5 w-5" />,
    powers: ['Общие квесты и контракты', 'Биржа ALTAN', 'Суд уровня округа', 'Законотворчество Зуна'],
  },
  {
    n: 3, key: 'myangan', label: 'Мьянган', sub: '10 Зунов · 100 Арбанов · 1 000 граждан',
    color: 'blue',
    desc: '10 Зунов = Мьянган (район). Главы Зунов избирают власть района. Своё казначейство и налоги.',
    icon: <Shield className="h-5 w-5" />,
    powers: ['Казначейство района', 'Государственные предприятия', 'Верховный суд района', 'Региональные законы'],
  },
  {
    n: 4, key: 'tumen', label: 'Тумэн', sub: '10 Мьянганов · 1 000 Арбанов · 10 000 граждан',
    color: 'purple',
    desc: '10 Мьянганов = Тумэн (провинция / город). Полная территориальная автономия. Суверенный фонд.',
    icon: <Globe className="h-5 w-5" />,
    powers: ['Суверенный фонд', 'Хурал (парламент) Тумэна', 'Конституционный суд', 'Сотрудничество с другими Тумэнами'],
  },
];

const C: Record<string, {
  accent: string; bg: string; ring: string; badge: string; bar: string;
}> = {
  amber:  { accent: 'text-amber-400',   bg: 'bg-amber-500/10',   ring: 'border-amber-500/30',   badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',   bar: 'bg-amber-400' },
  orange: { accent: 'text-orange-400',  bg: 'bg-orange-500/10',  ring: 'border-orange-500/30',  badge: 'border-orange-500/30 bg-orange-500/10 text-orange-400',  bar: 'bg-orange-400' },
  blue:   { accent: 'text-blue-400',    bg: 'bg-blue-500/10',    ring: 'border-blue-500/30',    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-400',    bar: 'bg-blue-400' },
  purple: { accent: 'text-purple-400',  bg: 'bg-purple-500/10',  ring: 'border-purple-500/30',  badge: 'border-purple-500/30 bg-purple-500/10 text-purple-400',  bar: 'bg-purple-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{text}</span>
  );
}

function ActionRow({ icon, label, desc, href, c }: {
  icon: React.ReactNode; label: string; desc: string; href: string;
  c: { accent: string; bg: string };
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/30 bg-slate-800/10 hover:bg-slate-800/30 hover:border-slate-600/50 transition-all group">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg} ${c.accent}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-none">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
    </Link>
  );
}

// ── Member chip ───────────────────────────────────────────────────────────

function MemberChip({ m, isLeader, c }: { m: OrgMember; isLeader: boolean; c: { accent: string; bg: string; ring: string } }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl border ${c.ring} ${c.bg}`}>
      <div className={`h-7 w-7 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${c.accent}`}>
        {(m.user.username || m.user.seatId).slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white leading-none truncate">
          {m.user.username || m.user.seatId}
        </p>
        <p className="text-[9px] text-slate-500">{isLeader ? '👑 Лидер' : m.role}</p>
      </div>
      {m.user.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
    </div>
  );
}

// ── Locked level card (no membership) ─────────────────────────────────────

function LockedLevel({
  lvl, prevLvl, prevMemberCount, parentJoinUrl,
}: {
  lvl: typeof LEVELS[0];
  prevLvl: typeof LEVELS[0];
  prevMemberCount: number;
  parentJoinUrl?: string;
}) {
  const c = C[lvl.color];
  return (
    <div className={`rounded-2xl border ${c.ring} bg-slate-800/10 overflow-hidden`}>
      {/* Header */}
      <div className={`${c.bg} px-5 py-4 flex items-center justify-between border-b ${c.ring}`}>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl ${c.bg} border ${c.ring} flex items-center justify-center ${c.accent}`}>
            {lvl.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold ${c.accent}`}>{lvl.label}</h3>
              <Pill text="Не подключён" color="border-slate-600/30 bg-slate-500/10 text-slate-500" />
            </div>
            <p className="text-[10px] text-slate-500">{lvl.sub}</p>
          </div>
        </div>
        <Lock className="h-5 w-5 text-slate-600" />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">{lvl.desc}</p>

        {/* Powers unlocked at this level */}
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Открывает доступ к:</p>
          <div className="grid grid-cols-1 gap-1.5">
            {lvl.powers.map(p => (
              <div key={p} className="flex items-center gap-2 text-xs text-slate-500">
                <div className={`h-1.5 w-1.5 rounded-full ${c.bar} opacity-40`} />
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`rounded-xl border ${c.ring} ${c.bg} p-4`}>
          <p className="text-xs text-slate-400 mb-3">
            Чтобы войти в <strong className={c.accent}>{lvl.label}</strong>, нужно объединить{' '}
            {lvl.n === 2 ? '10 Арбанов' : lvl.n === 3 ? '10 Зунов' : '10 Мьянганов'}.
            У вас уже подключён {prevLvl.label}
            {prevMemberCount !== undefined && ` (${prevMemberCount} / ${lvl.n === 2 ? 10 : 10})`}.
          </p>
          <div className="flex gap-2">
            <Link href={parentJoinUrl || '/hierarchy'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${c.bg} border ${c.ring} ${c.accent} hover:opacity-80 transition-all`}>
              <Plus className="h-3.5 w-3.5" /> Подать заявку в {lvl.label}
            </Link>
            <Link href="/hierarchy"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border border-slate-700/30 text-slate-400 hover:bg-slate-800/30 transition-all">
              <Globe className="h-3.5 w-3.5" /> Карта
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Active level card ─────────────────────────────────────────────────────

function ActiveLevel({ lvl, org }: { lvl: typeof LEVELS[0]; org: OrgNode }) {
  const c = C[lvl.color];
  const maxMembers = lvl.n === 1 ? 10 : 10; // each tier slots 10 sub-units
  const memberCount = org._count?.members ?? org.members?.length ?? 0;
  const fillPct = Math.round((memberCount / (lvl.n === 1 ? 10 : memberCount)) * 100);

  const ACTIONS: Record<string, { icon: React.ReactNode; l: string; d: string; href: string }[]> = {
    arban: [
      { icon: <Vote className="h-4 w-4" />,         l: 'Выборы Хурала',   d: 'Избрать лидера Арбана по 4 ветвям',           href: '/elections/khural' },
      { icon: <Briefcase className="h-4 w-4" />,    l: 'Квесты',           d: 'Задачи для граждан Арбана',                   href: '/quests'           },
      { icon: <FileText className="h-4 w-4" />,     l: 'Контракты',        d: 'Договоры между гражданами',                   href: '/chancellery'      },
      { icon: <Gavel className="h-4 w-4" />,        l: 'Суд Арбана',      d: 'Подать иск или жалобу',                       href: '/judicial'         },
      { icon: <Megaphone className="h-4 w-4" />,    l: 'Петиции',          d: 'Народная Площадь Арбана',                     href: '/square'           },
    ],
    zun: [
      { icon: <Vote className="h-4 w-4" />,         l: 'Выборы Зуна',     d: '4 ветви власти уровня Зуна',                  href: '/elections/khural' },
      { icon: <ArrowRightLeft className="h-4 w-4" />, l: 'Биржа ALTAN',   d: 'Торговля между Арбанами',                     href: '/exchange'         },
      { icon: <Zap className="h-4 w-4" />,          l: 'Банкинг Зуна',   d: 'Общий счёт и финансы',                        href: '/org-banking'      },
      { icon: <Gavel className="h-4 w-4" />,        l: 'Суд Зуна',       d: 'Дела уровня округа',                          href: '/judicial'         },
      { icon: <Activity className="h-4 w-4" />,     l: 'Дашборд',         d: 'Состояние власти на уровне Зуна',             href: '/governance'       },
    ],
    myangan: [
      { icon: <Vote className="h-4 w-4" />,         l: 'Выборы Мьянгана', d: 'Главы Зунов избирают районную власть',        href: '/elections/khural' },
      { icon: <BarChart3 className="h-4 w-4" />,    l: 'Казначейство',    d: 'Бюджет и налоги района',                     href: '/treasury'         },
      { icon: <Building2 className="h-4 w-4" />,    l: 'Гос. предприятия', d: 'Корпорации уровня Мьянгана',                href: '/cooperatives'     },
      { icon: <Scale className="h-4 w-4" />,        l: 'Суд Мьянгана',   d: 'Уголовные и административные дела',           href: '/judicial'         },
      { icon: <FileText className="h-4 w-4" />,     l: 'Парламент',       d: 'Законодательные инициативы района',           href: '/parliament'       },
    ],
    tumen: [
      { icon: <Crown className="h-4 w-4" />,        l: 'Хурал Тумэна',   d: 'Верховная палата Тумэна',                     href: '/khural'           },
      { icon: <Star className="h-4 w-4" />,         l: 'Суверенный Фонд', d: 'Инвестиции и стратегические резервы',        href: '/fund'             },
      { icon: <Zap className="h-4 w-4" />,          l: 'Казначейство',    d: 'Государственный бюджет Тумэна',              href: '/treasury'         },
      { icon: <Globe className="h-4 w-4" />,        l: 'Сотрудничество',  d: 'Соглашения с другими Тумэнами',              href: '/hierarchy'        },
      { icon: <Scale className="h-4 w-4" />,        l: 'Конституц. суд', d: 'Конституционные дела Тумэна',                href: '/judicial'         },
    ],
  };

  const actions = ACTIONS[lvl.key] ?? [];

  return (
    <div className={`rounded-2xl border ${c.ring} overflow-hidden`}>
      {/* Header */}
      <div className={`${c.bg} px-5 py-4 border-b ${c.ring}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-xl ${c.bg} border ${c.ring} flex items-center justify-center ${c.accent}`}>
              {lvl.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-base font-bold ${c.accent}`}>{org.name}</h3>
                {org.isLeader && <Pill text="👑 Вы лидер" color={c.badge} />}
                <Pill text={lvl.label} color={c.badge} />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{lvl.sub}</p>
            </div>
          </div>
          <Unlock className={`h-4 w-4 ${c.accent}`} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-900/40 p-2.5 text-center">
            <p className={`text-sm font-bold ${c.accent}`}>{memberCount}</p>
            <p className="text-[9px] text-slate-600">Участников</p>
          </div>
          <div className="rounded-xl bg-slate-900/40 p-2.5 text-center">
            <p className="text-sm font-bold text-white">{org.ownershipType ?? '—'}</p>
            <p className="text-[9px] text-slate-600">Тип</p>
          </div>
          <div className="rounded-xl bg-slate-900/40 p-2.5 text-center">
            <p className={`text-sm font-bold text-emerald-400`}>
              {org.overallRating ? org.overallRating.toFixed(1) : '—'}
            </p>
            <p className="text-[9px] text-slate-600">Рейтинг</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">

        {/* Members (only for Arban level — small enough to show) */}
        {lvl.key === 'arban' && org.members && org.members.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
              👥 Члены ({org.members.length}/10)
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {org.members.map(m => (
                <MemberChip key={m.id} m={m} isLeader={m.user.id === org.leaderId} c={c} />
              ))}
              {org.members.length < 10 && (
                <div className="flex items-center gap-2 p-2 col-span-2 rounded-xl border border-dashed border-slate-700/30 text-xs text-slate-600">
                  <Plus className="h-3 w-3" />
                  {10 - org.members.length} свободных мест
                </div>
              )}
            </div>
            {/* Capacity bar */}
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${c.bar} transition-all`}
                  style={{ width: `${(org.members.length / 10) * 100}%` }} />
              </div>
              <p className="text-[9px] text-slate-600 mt-0.5 text-right">
                {org.members.length}/10 граждан
              </p>
            </div>
          </div>
        )}

        {/* Child count for higher levels */}
        {lvl.key !== 'arban' && org.children && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
              {lvl.key === 'zun' ? '🏘 Арбаны'
                : lvl.key === 'myangan' ? '🏙 Зуны'
                : '🌆 Мьянганы'} ({org.children.length}/{10})
            </p>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${c.bar} transition-all`}
                style={{ width: `${(org.children.length / 10) * 100}%` }} />
            </div>
            <p className="text-[9px] text-slate-600 mt-0.5 text-right">
              {org.children.length}/10 объединено
            </p>
          </div>
        )}

        {/* Actions */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
            ⚡ Возможности уровня
          </p>
          <div className="space-y-1.5">
            {actions.map(a => (
              <ActionRow key={a.l} icon={a.icon} label={a.l} desc={a.d} href={a.href} c={c} />
            ))}
          </div>
        </div>

        {/* Link to full org page */}
        <Link href={`/organizations/${org.id}`}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border ${c.ring} ${c.bg} ${c.accent} text-xs font-semibold hover:opacity-80 transition-all`}>
          <Building2 className="h-3.5 w-3.5" /> Полная страница организации
        </Link>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ArbanPage() {
  const [loading, setLoading] = useState(true);
  // hierarchy: [arban, zun, myangan, tumen] — null if not member
  const [hierarchy, setHierarchy] = useState<(OrgNode | null)[]>([null, null, null, null]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Step 1: load the user's Arban
        const arban = await api.get<OrgNode>('/organizations/my-arban').catch(() => null);
        const chain: (OrgNode | null)[] = [arban, null, null, null];

        // Step 2: walk up the parent chain via parent.id
        let cursor: OrgNode | null = arban;
        for (let i = 1; i < 4 && cursor?.parent?.id; i++) {
          try {
            cursor = await api.get<OrgNode>(`/organizations/${cursor.parent.id}`);
            chain[i] = cursor;
          } catch {
            break;
          }
        }

        setHierarchy(chain);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <TreePine className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold">Арбан & Иерархия</h1>
            <p className="text-xs text-slate-400">
              Арбан → Зун (×10) → Мьянган (×100) → Тумэн (×1000)
            </p>
          </div>
        </div>

        {/* Visual ladder */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {LEVELS.map((lvl, i) => {
            const active = hierarchy[i] !== null;
            const c = C[lvl.color];
            return (
              <div key={lvl.key} className="flex items-center gap-1">
                <button onClick={() => {
                  document.getElementById(`level-${lvl.key}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    active
                      ? `${c.bg} ${c.ring} ${c.accent}`
                      : 'border-slate-700/30 text-slate-600 bg-slate-800/10'
                  }`}
                >
                  {active ? <Unlock className="h-3.5 w-3.5 mb-0.5" /> : <Lock className="h-3.5 w-3.5 mb-0.5" />}
                  {lvl.label}
                </button>
                {i < LEVELS.length - 1 && (
                  <ArrowUp className="h-3.5 w-3.5 text-slate-700 rotate-90 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* No Arban at all */}
        {!hierarchy[0] && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center mb-6">
            <Users className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">У вас ещё нет Арбана</h2>
            <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
              Арбан — базовая ячейка (10 граждан). Создайте свой или вступите в существующий.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/organizations/create"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-all">
                <Plus className="h-4 w-4" /> Создать Арбан
              </Link>
              <Link href="/organizations/leaderboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition-all">
                <Building2 className="h-4 w-4" /> Найти Арбан
              </Link>
            </div>
          </div>
        )}

        {/* 4 level cards */}
        <div className="space-y-6">
          {LEVELS.map((lvl, i) => (
            <div key={lvl.key} id={`level-${lvl.key}`}>
              {hierarchy[i] ? (
                <ActiveLevel lvl={lvl} org={hierarchy[i]!} />
              ) : (
                // Only show locked card if previous level exists
                hierarchy[i - 1] ? (
                  <LockedLevel
                    lvl={lvl}
                    prevLvl={LEVELS[i - 1]}
                    prevMemberCount={hierarchy[i - 1]!._count?.members ?? 0}
                    parentJoinUrl={`/hierarchy`}
                  />
                ) : null
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA if not yet all levels */}
        {hierarchy.some(h => h === null) && hierarchy.some(h => h !== null) && (
          <div className="mt-8 rounded-2xl border border-slate-700/30 bg-slate-800/10 p-5 text-center">
            <TreePine className="h-6 w-6 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 mb-3">
              Объедините больше {hierarchy[0] ? 'Арбанов' : 'граждан'}, чтобы подняться до следующего уровня.
            </p>
            <Link href="/hierarchy"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700/40 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-all">
              <Globe className="h-3.5 w-3.5" /> Карта иерархии
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
