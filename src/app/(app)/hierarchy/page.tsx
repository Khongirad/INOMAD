'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Users, Crown, Building2, Vote, Scale, FileText,
  Megaphone, Zap, Briefcase, ArrowRightLeft, Globe,
  ChevronRight, Loader2, Activity, Gavel, Shield,
  TreePine, Star, BarChart3, MapPin,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Level configuration ───────────────────────────────────────────────────

const LEVELS = [
  {
    key: 'arban',  int: 1,    label: 'Арбан',    sub: '10 граждан',      color: 'amber',
    icon: <Users className="h-5 w-5" />,
    description: 'Базовая ячейка. Семьи, соседи, малый бизнес. Вы избираете лидера Арбана.',
  },
  {
    key: 'zun',    int: 10,   label: 'Зун',      sub: '100 граждан',     color: 'orange',
    icon: <Building2 className="h-5 w-5" />,
    description: 'Округ. 10 Арбанов. Лидеры Арбанов избирают главу Зуна по 4 ветвям.',
  },
  {
    key: 'myangan', int: 100, label: 'Мьянган',  sub: '1 000 граждан',   color: 'blue',
    icon: <Shield className="h-5 w-5" />,
    description: 'Район. 10 Зунов. Главы Зунов избирают главу Мьянгана.',
  },
  {
    key: 'tumen',  int: 1000, label: 'Тумэн',    sub: '10 000 граждан',  color: 'purple',
    icon: <Globe className="h-5 w-5" />,
    description: 'Город / провинция. 10 Мьянганов. Управляет территориальной автономией.',
  },
  {
    key: 'republic', int: 10000, label: 'Республика', sub: '∞ граждан', color: 'emerald',
    icon: <Crown className="h-5 w-5" />,
    description: 'Суверенная республика в составе Конфедерации. Полное самоуправление.',
  },
];

const COLOR: Record<string, { accent: string; ring: string; bg: string; badge: string }> = {
  amber:   { accent: 'text-amber-400',   ring: 'border-amber-500/40',   bg: 'bg-amber-500/10',   badge: 'border-amber-500/30 text-amber-400 bg-amber-500/10'   },
  orange:  { accent: 'text-orange-400',  ring: 'border-orange-500/40',  bg: 'bg-orange-500/10',  badge: 'border-orange-500/30 text-orange-400 bg-orange-500/10' },
  blue:    { accent: 'text-blue-400',    ring: 'border-blue-500/40',    bg: 'bg-blue-500/10',    badge: 'border-blue-500/30 text-blue-400 bg-blue-500/10'        },
  purple:  { accent: 'text-purple-400',  ring: 'border-purple-500/40',  bg: 'bg-purple-500/10',  badge: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
  emerald: { accent: 'text-emerald-400', ring: 'border-emerald-500/40', bg: 'bg-emerald-500/10', badge: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
};

// ── Powers per level ──────────────────────────────────────────────────────

const POWERS: Record<string, {
  governance: { label: string; desc: string; href: string; icon: React.ReactNode }[];
  market:     { label: string; desc: string; href: string; icon: React.ReactNode }[];
  judicial:   { label: string; desc: string; href: string; icon: React.ReactNode }[];
  forum:      { label: string; desc: string; href: string; icon: React.ReactNode }[];
}> = {
  arban: {
    governance: [
      { label: 'Выборы Арбана',  desc: 'Избрать лидера по каждой ветви власти', href: '/elections/khural', icon: <Vote className="h-4 w-4" /> },
      { label: 'Дашборд',       desc: 'Состояние государства на уровне Арбана',  href: '/governance',       icon: <Activity className="h-4 w-4" /> },
    ],
    market: [
      { label: 'Задачи',        desc: 'Квесты доступные для гражданина Арбана',  href: '/quests',           icon: <Briefcase className="h-4 w-4" /> },
      { label: 'Контракты',     desc: 'Заключить договор с соседями',             href: '/chancellery',      icon: <FileText className="h-4 w-4" /> },
      { label: 'Кооперативы',   desc: 'Создать или вступить в кооператив',       href: '/cooperatives',     icon: <Users className="h-4 w-4" /> },
    ],
    judicial: [
      { label: 'Подать иск',    desc: 'Открыть дело в суде Арбана',              href: '/judicial',         icon: <Gavel className="h-4 w-4" /> },
      { label: 'Жалобы',        desc: 'Жалоба на нарушения прав',               href: '/complaints',        icon: <Scale className="h-4 w-4" /> },
    ],
    forum: [
      { label: 'Народная Площадь', desc: 'Петиции и дебаты Арбана',             href: '/square',            icon: <Megaphone className="h-4 w-4" /> },
    ],
  },
  zun: {
    governance: [
      { label: 'Выборы Зуна',   desc: 'Лидеры Арбанов избирают власть Зуна',    href: '/elections/khural',  icon: <Vote className="h-4 w-4" /> },
      { label: 'Дашборд',       desc: 'Состояние государства на уровне Зуна',    href: '/governance',        icon: <Activity className="h-4 w-4" /> },
      { label: 'Парламент',     desc: 'Законопроекты на уровне Зуна',            href: '/parliament',        icon: <FileText className="h-4 w-4" /> },
    ],
    market: [
      { label: 'Биржа',         desc: 'Торговля ALTAN между Арбанами',           href: '/exchange',          icon: <ArrowRightLeft className="h-4 w-4" /> },
      { label: 'Задачи',        desc: 'Размещение задач для Арбанов',            href: '/quests',            icon: <Briefcase className="h-4 w-4" /> },
      { label: 'Банкинг',       desc: 'Счёт организации Зуна',                   href: '/org-banking',       icon: <Zap className="h-4 w-4" /> },
    ],
    judicial: [
      { label: 'Суд Зуна',      desc: 'Дела уровня округа',                     href: '/judicial',          icon: <Gavel className="h-4 w-4" /> },
      { label: 'Споры',         desc: 'Коммерческие и трудовые споры',           href: '/disputes',          icon: <Scale className="h-4 w-4" /> },
    ],
    forum: [
      { label: 'Площадь Зуна',  desc: 'Петиции и дебаты на уровне Зуна',        href: '/square',            icon: <Megaphone className="h-4 w-4" /> },
    ],
  },
  myangan: {
    governance: [
      { label: 'Выборы Мьянгана', desc: 'Главы Зунов избирают власть района',   href: '/elections/khural',  icon: <Vote className="h-4 w-4" /> },
      { label: 'Государство',    desc: 'Полный статус государственного аппарата', href: '/governance',        icon: <Activity className="h-4 w-4" /> },
      { label: 'Парламент',      desc: 'Законодательные инициативы',              href: '/parliament',        icon: <FileText className="h-4 w-4" /> },
      { label: 'Территория',     desc: 'Карта и структура Мьянгана',             href: '/territory',         icon: <Globe className="h-4 w-4" /> },
    ],
    market: [
      { label: 'Биржа',          desc: 'ALTAN торговля в масштабе Мьянгана',     href: '/exchange',          icon: <ArrowRightLeft className="h-4 w-4" /> },
      { label: 'Гос. корпорации', desc: 'Государственные предприятия Мьянгана', href: '/cooperatives',      icon: <Building2 className="h-4 w-4" /> },
      { label: 'Налоги',         desc: 'Налоговые декларации организаций',        href: '/tax',               icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Казначейство',   desc: 'Бюджет и суверенный фонд',               href: '/treasury',          icon: <Zap className="h-4 w-4" /> },
    ],
    judicial: [
      { label: 'Суд Мьянгана',   desc: 'Уголовные и административные дела',      href: '/judicial',          icon: <Gavel className="h-4 w-4" /> },
      { label: 'Канцелярия',     desc: 'Реестр нотариусов и юристов',            href: '/chancellery',        icon: <FileText className="h-4 w-4" /> },
    ],
    forum: [
      { label: 'Площадь',        desc: 'Петиции и законодательные инициативы',   href: '/square',            icon: <Megaphone className="h-4 w-4" /> },
      { label: 'Архив',          desc: 'История решений Мьянгана',               href: '/registries/history', icon: <FileText className="h-4 w-4" /> },
    ],
  },
  tumen: {
    governance: [
      { label: 'Выборы Тумэна',  desc: 'Главы Мьянганов избирают власть Тумэна', href: '/elections/khural', icon: <Vote className="h-4 w-4" /> },
      { label: 'Дашборд',        desc: 'Полный государственный дашборд Тумэна',   href: '/governance',        icon: <Activity className="h-4 w-4" /> },
      { label: 'Государственная карта', desc: 'Структура власти Тумэна',         href: '/state',              icon: <Globe className="h-4 w-4" /> },
      { label: 'Хурал',          desc: 'Парламент и комитеты Тумэна',            href: '/khural',             icon: <Crown className="h-4 w-4" /> },
    ],
    market: [
      { label: 'Фонд',           desc: 'Суверенный фонд Тумэна',                 href: '/fund',              icon: <Star className="h-4 w-4" /> },
      { label: 'Казначейство',   desc: 'Бюджет и расходы',                       href: '/treasury',          icon: <Zap className="h-4 w-4" /> },
      { label: 'Биржа',          desc: 'Торговля ALTAN',                          href: '/exchange',          icon: <ArrowRightLeft className="h-4 w-4" /> },
      { label: 'Сотрудничество', desc: 'Соглашения между Тумэнами',              href: '/hierarchy',         icon: <Users className="h-4 w-4" /> },
    ],
    judicial: [
      { label: 'Верховный суд',  desc: 'Апелляции и дела Тумэна',               href: '/judicial',          icon: <Gavel className="h-4 w-4" /> },
      { label: 'Жалобы',         desc: 'Жалобы на уровне Тумэна',               href: '/complaints',         icon: <Scale className="h-4 w-4" /> },
    ],
    forum: [
      { label: 'Народная Площадь', desc: 'Стратегические петиции Тумэна',       href: '/square',            icon: <Megaphone className="h-4 w-4" /> },
      { label: 'Хроника',        desc: 'История решений и архивы',               href: '/history',           icon: <FileText className="h-4 w-4" /> },
    ],
  },
  republic: {
    governance: [
      { label: 'Выборы Республики', desc: 'Главы Тумэнов избирают власть Республики', href: '/elections/khural', icon: <Vote className="h-4 w-4" /> },
      { label: 'Конституция',    desc: 'Конституционные принципы и ЦИК',         href: '/governance',        icon: <Activity className="h-4 w-4" /> },
      { label: 'Хурал (верхний)', desc: 'Верховная палата Республики',           href: '/parliament',        icon: <Crown className="h-4 w-4" /> },
      { label: 'ЦИК',           desc: 'Комиссия по выборам',                     href: '/elections/khural',  icon: <Shield className="h-4 w-4" /> },
    ],
    market: [
      { label: 'Национальный Банк', desc: 'Центральный банк, эмиссия ALTAN',    href: '/org-banking',       icon: <Zap className="h-4 w-4" /> },
      { label: 'Суверенный Фонд', desc: 'Государственные инвестиции',            href: '/fund',              icon: <Star className="h-4 w-4" /> },
      { label: 'Казначейство',   desc: 'Государственный бюджет',                 href: '/treasury',          icon: <BarChart3 className="h-4 w-4" /> },
      { label: 'Гражданство',    desc: 'Реестр граждан Республики',              href: '/citizenship',       icon: <MapPin className="h-4 w-4" /> },
    ],
    judicial: [
      { label: 'Верховный суд',  desc: 'Конституционный суд Республики',         href: '/judicial',          icon: <Gavel className="h-4 w-4" /> },
      { label: 'Канцелярия',     desc: 'Государственный реестр',                 href: '/chancellery',       icon: <FileText className="h-4 w-4" /> },
    ],
    forum: [
      { label: 'Народная Площадь', desc: 'Конституционные петиции',              href: '/square',            icon: <Megaphone className="h-4 w-4" /> },
      { label: 'Архив Республики', desc: 'История законодательства',             href: '/history',           icon: <FileText className="h-4 w-4" /> },
    ],
  },
};

// ── Action row ────────────────────────────────────────────────────────────

function ActionRow({ item, color }: {
  item: { label: string; desc: string; href: string; icon: React.ReactNode };
  color: { accent: string; bg: string };
}) {
  return (
    <Link href={item.href}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/30 hover:border-slate-600/50 bg-slate-800/10 hover:bg-slate-800/30 transition-all group"
    >
      <div className={`h-8 w-8 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0 ${color.accent}`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-none">{item.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
    </Link>
  );
}

// ── Level panel ───────────────────────────────────────────────────────────

function LevelPanel({ lvl }: { lvl: typeof LEVELS[0] }) {
  const c  = COLOR[lvl.color];
  const pw = POWERS[lvl.key];

  const sections = [
    { title: '🗳 Управление & Выборы', items: pw.governance },
    { title: '📈 Рынок & Экономика',   items: pw.market     },
    { title: '⚖ Судебная защита',      items: pw.judicial   },
    { title: '📣 Народная Площадь',    items: pw.forum      },
  ];

  return (
    <div className="space-y-6">
      {/* Level hero */}
      <div className={`rounded-2xl border ${c.ring} ${c.bg} p-5`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center ${c.accent} border ${c.ring}`}>
            {lvl.icon}
          </div>
          <div>
            <h2 className={`text-lg font-bold ${c.accent}`}>{lvl.label}</h2>
            <p className="text-xs text-slate-400">{lvl.sub}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">{lvl.description}</p>
      </div>

      {/* Sections */}
      {sections.map(s => (
        <div key={s.title}>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{s.title}</h3>
          <div className="space-y-2">
            {s.items.map(item => (
              <ActionRow key={item.label} item={item} color={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function HierarchyPage() {
  const [activeLvl, setActiveLvl] = useState('arban');
  const [stats, setStats] = useState<{ citizens?: number; orgs?: number; elections?: number } | null>(null);

  useEffect(() => {
    api.get<any>('/governance/summary')
      .then(d => setStats({
        citizens:  d?.citizenCount,
        orgs:      d?.orgCount,
        elections: d?.electionLadder?.length,
      }))
      .catch(() => null);
  }, []);

  const lvl = LEVELS.find(l => l.key === activeLvl) ?? LEVELS[0];
  const c   = COLOR[lvl.color];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <TreePine className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold">Панель гражданина по уровням</h1>
            <p className="text-xs text-slate-400">Арбан → Зун → Мьянган → Тумэн → Республика</p>
          </div>
        </div>

        {/* Nation state stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Граждан', value: stats.citizens ?? '—' },
              { label: 'Организаций', value: stats.orgs ?? '—' },
              { label: 'Активных выборов', value: stats.elections ?? '—' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-4 text-center">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Level selector */}
        <div className="flex gap-1 overflow-x-auto mb-6 pb-1">
          {LEVELS.map(l => {
            const lc = COLOR[l.color];
            const active = activeLvl === l.key;
            return (
              <button key={l.key} onClick={() => setActiveLvl(l.key)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? `${lc.badge} border-opacity-100`
                    : 'text-slate-400 border-transparent hover:border-slate-700/40 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        {/* Active level panel */}
        <LevelPanel lvl={lvl} />
      </div>
    </div>
  );
}
