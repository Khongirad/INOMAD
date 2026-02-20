'use client';

import { useState } from 'react';
import {
  Landmark, Scale, Coins, Shield,
  Users, ChevronRight, Lock, Circle,
  Star, Crown, Gavel, Building2,
  Banknote, Vote, BookOpen, Scroll,
  X, UserPlus, Eye, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────
type BranchKey = 'legislative' | 'executive' | 'judicial' | 'monetary';

interface Position {
  id: string;
  title: string;
  titleRu: string;
  holder: string | null;           // null = vacant
  level: 'top' | 'mid' | 'base';
  entry: string;                   // how to get this role
  vacant: boolean;
  count?: number;                  // for multi-seat positions
}

interface Branch {
  key: BranchKey;
  name: string;
  nameRu: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  sectorColor: string;
  description: string;
  entryRule: string;
  positions: Position[];
}

// ─── Data ────────────────────────────────────────────────
const BRANCHES: Branch[] = [
  {
    key: 'legislative',
    name: 'Khural',
    nameRu: 'Хурал (Законодательная)',
    icon: Landmark,
    color: 'amber',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.25)]',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    sectorColor: '#f59e0b',
    description: 'Supreme legislative body of the confederation. Enacts laws, elects the Central Bank governor, and oversees all branches.',
    entryRule: 'Direct election by verified citizens',
    positions: [
      { id: 'speaker', title: 'Speaker of Khural', titleRu: 'Председатель Хурала', holder: null, level: 'top', entry: 'Elected by deputies', vacant: true },
      { id: 'deputy-speaker', title: 'Deputy Speaker', titleRu: 'Заместитель Председателя', holder: null, level: 'mid', entry: 'Elected by deputies', vacant: true },
      { id: 'deputy', title: 'Deputy', titleRu: 'Депутат', holder: null, level: 'base', entry: 'Direct citizen election', vacant: true, count: 100 },
      { id: 'committee-chair', title: 'Committee Chair', titleRu: 'Председатель Комитета', holder: null, level: 'mid', entry: 'Appointed by Speaker', vacant: true, count: 10 },
    ],
  },
  {
    key: 'executive',
    name: 'Government',
    nameRu: 'Правительство (Исполнительная)',
    icon: Shield,
    color: 'emerald',
    glow: 'shadow-[0_0_60px_rgba(16,185,129,0.25)]',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
    sectorColor: '#10b981',
    description: 'Implements laws and manages state services — migration, ZAGS, land registry, education, health.',
    entryRule: 'Appointed by Khural upon Prime Minister nomination',
    positions: [
      { id: 'pm', title: 'Prime Minister', titleRu: 'Премьер-Министр', holder: null, level: 'top', entry: 'Elected by Khural', vacant: true },
      { id: 'minister', title: 'Minister', titleRu: 'Министр', holder: null, level: 'mid', entry: 'Nominated by PM, confirmed by Khural', vacant: true, count: 8 },
      { id: 'dept-head', title: 'Department Head', titleRu: 'Руководитель Department', holder: null, level: 'base', entry: 'Appointed by Minister', vacant: true, count: 24 },
    ],
  },
  {
    key: 'judicial',
    name: 'Courts',
    nameRu: 'Суд (Судебная)',
    icon: Scale,
    color: 'purple',
    glow: 'shadow-[0_0_60px_rgba(168,85,247,0.25)]',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    sectorColor: '#a855f7',
    description: 'Interprets laws, resolves disputes, and protects citizen rights. Independent from all other branches.',
    entryRule: 'Nominated by Khural, confirmed by citizen referendum',
    positions: [
      { id: 'chief-justice', title: 'Chief Justice', titleRu: 'Главный Судья', holder: null, level: 'top', entry: 'Elected by Khural', vacant: true },
      { id: 'justice', title: 'Justice', titleRu: 'Судья', holder: null, level: 'mid', entry: 'Nominated by Chief Justice, confirmed by Khural', vacant: true, count: 9 },
      { id: 'clerk', title: 'Court Clerk', titleRu: 'Секретарь Суда', holder: null, level: 'base', entry: 'Appointed by Justices', vacant: true, count: 18 },
    ],
  },
  {
    key: 'monetary',
    name: 'Central Bank',
    nameRu: 'Центральный Банк (Монетарная)',
    icon: Coins,
    color: 'blue',
    glow: 'shadow-[0_0_60px_rgba(59,130,246,0.25)]',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    sectorColor: '#3b82f6',
    description: 'Sole authority for ALTAN emission and monetary policy. Issues banking licenses. Oversees Bank of Siberia.',
    entryRule: 'Governor elected by Khural. Board members appointed by Governor.',
    positions: [
      { id: 'governor', title: 'CB Governor', titleRu: 'Управляющий ЦБ', holder: 'Creator (temporary)', level: 'top', entry: 'Elected by Khural', vacant: false },
      { id: 'board', title: 'Board Member', titleRu: 'Член Совета ЦБ', holder: null, level: 'mid', entry: 'Appointed by Governor', vacant: true, count: 5 },
      { id: 'bank-siberia-ceo', title: 'Bank of Siberia — Director', titleRu: 'Директор Банка Сибири', holder: 'Creator (temporary)', level: 'mid', entry: 'Licensed by Central Bank', vacant: false },
      { id: 'bank-officer', title: 'Bank Officer', titleRu: 'Сотрудник Банка', holder: null, level: 'base', entry: 'Appointed by Bank of Siberia Director', vacant: true, count: 12 },
    ],
  },
];

// ─── Wheel Sector SVG ─────────────────────────────────────
function WheelSector({
  index, total, color, active, onClick, branch,
}: {
  index: number;
  total: number;
  color: string;
  active: boolean;
  onClick: () => void;
  branch: Branch;
}) {
  const angle = 360 / total;
  const startAngle = index * angle - 90;
  const endAngle = startAngle + angle;
  const gap = 4; // degrees gap between sectors

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cx = 200, cy = 200, outerR = 170, innerR = 70;

  const s = toRad(startAngle + gap / 2);
  const e = toRad(endAngle - gap / 2);

  const x1 = cx + outerR * Math.cos(s);
  const y1 = cy + outerR * Math.sin(s);
  const x2 = cx + outerR * Math.cos(e);
  const y2 = cy + outerR * Math.sin(e);
  const x3 = cx + innerR * Math.cos(e);
  const y3 = cy + innerR * Math.sin(e);
  const x4 = cx + innerR * Math.cos(s);
  const y4 = cy + innerR * Math.sin(s);

  const largeArc = angle - gap > 180 ? 1 : 0;

  const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

  // Icon position
  const midAngle = toRad(startAngle + angle / 2);
  const iconR = (outerR + innerR) / 2;
  const ix = cx + iconR * Math.cos(midAngle);
  const iy = cy + iconR * Math.sin(midAngle);

  const Icon = branch.icon;
  const vacantCount = branch.positions.filter(p => p.vacant).length;

  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      style={{ filter: active ? `drop-shadow(0 0 12px ${color}88)` : undefined }}
    >
      <path
        d={d}
        fill={active ? `${color}33` : `${color}18`}
        stroke={active ? color : `${color}44`}
        strokeWidth={active ? 2 : 1}
        className="transition-all duration-300"
      />
      {/* Vacant dot */}
      {vacantCount > 0 && (
        <circle cx={x2 - 12} cy={y2 + 6} r={5} fill="#ef4444" opacity={0.8} />
      )}
      {/* Foreign object for icon */}
      <foreignObject x={ix - 14} y={iy - 14} width={28} height={28}>
        <div className="flex items-center justify-center w-full h-full">
          <Icon
            size={18}
            style={{ color: active ? color : `${color}99` }}
          />
        </div>
      </foreignObject>
    </g>
  );
}

// ─── Position Card ────────────────────────────────────────
function PositionCard({ pos, branch }: { pos: Position; branch: Branch }) {
  const levelStyles = {
    top: 'border-l-2',
    mid: 'border-l',
    base: 'border-l border-dashed',
  };

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-lg transition-all group',
      pos.vacant
        ? 'bg-zinc-900/40 hover:bg-zinc-800/40'
        : 'bg-zinc-900/70 hover:bg-zinc-800/70',
      levelStyles[pos.level],
      branch.borderColor,
    )}>
      {/* Status dot */}
      <div className={cn(
        'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
        pos.vacant ? 'bg-red-500/70' : 'bg-green-500',
      )} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-semibold', branch.textColor)}>
            {pos.title}
            {pos.count && <span className="text-xs text-zinc-500 ml-1">×{pos.count}</span>}
          </span>
          {pos.vacant && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
              VACANT
            </span>
          )}
          {!pos.vacant && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-mono">
              OCCUPIED
            </span>
          )}
        </div>
        <div className="text-[10px] text-zinc-600 mt-0.5">{pos.titleRu}</div>
        {pos.holder && (
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            <Crown size={10} className="text-amber-400" />
            {pos.holder}
          </div>
        )}
        <div className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
          <Lock size={9} />
          Entry: {pos.entry}
        </div>
      </div>

      {pos.vacant && (
        <button className={cn(
          'text-[10px] px-2 py-1 rounded border transition-all opacity-0 group-hover:opacity-100 flex-shrink-0',
          branch.textColor, branch.borderColor, branch.bgColor,
        )}>
          <UserPlus size={10} className="inline mr-1" />
          Apply
        </button>
      )}
    </div>
  );
}

// ─── Branch Panel ─────────────────────────────────────────
function BranchPanel({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const Icon = branch.icon;
  const vacantCount = branch.positions.filter(p => p.vacant).length;
  const totalPositions = branch.positions.reduce((acc, p) => acc + (p.count || 1), 0);
  const occupiedCount = branch.positions.filter(p => !p.vacant).reduce((acc, p) => acc + (p.count || 1), 0);

  const byLevel = {
    top: branch.positions.filter(p => p.level === 'top'),
    mid: branch.positions.filter(p => p.level === 'mid'),
    base: branch.positions.filter(p => p.level === 'base'),
  };

  return (
    <div className="animate-in slide-in-from-right-8 duration-500 flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        'flex items-start justify-between p-5 border-b',
        branch.borderColor,
      )}>
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-xl flex-shrink-0', branch.bgColor)}>
            <Icon size={22} className={branch.textColor} />
          </div>
          <div>
            <h2 className={cn('text-lg font-bold', branch.textColor)}>{branch.name}</h2>
            <div className="text-xs text-zinc-500">{branch.nameRu}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 px-5 py-3 border-b border-zinc-800/50">
        <div className="text-center">
          <div className={cn('text-xl font-mono font-bold', branch.textColor)}>{totalPositions}</div>
          <div className="text-[10px] text-zinc-600 uppercase">Total Seats</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-mono font-bold text-green-400">{occupiedCount}</div>
          <div className="text-[10px] text-zinc-600 uppercase">Occupied</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-mono font-bold text-red-400">{totalPositions - occupiedCount}</div>
          <div className="text-[10px] text-zinc-600 uppercase">Vacant</div>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500">
          <Lock size={10} />
          {branch.entryRule}
        </div>
      </div>

      {/* Description */}
      <div className="px-5 py-3 text-xs text-zinc-400 leading-relaxed border-b border-zinc-800/30">
        {branch.description}
      </div>

      {/* Org chart */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Top tier */}
        {byLevel.top.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <Crown size={10} className="text-amber-500" />
              Leadership
            </div>
            {byLevel.top.map(p => (
              <PositionCard key={p.id} pos={p} branch={branch} />
            ))}
          </div>
        )}

        {/* Mid tier */}
        {byLevel.mid.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest flex items-center gap-2 pl-3">
              <Star size={10} /> Directors & Boards
            </div>
            {byLevel.mid.map(p => (
              <PositionCard key={p.id} pos={p} branch={branch} />
            ))}
          </div>
        )}

        {/* Base tier */}
        {byLevel.base.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest flex items-center gap-2 pl-6">
              <Users size={10} /> Staff & Officers
            </div>
            {byLevel.base.map(p => (
              <PositionCard key={p.id} pos={p} branch={branch} />
            ))}
          </div>
        )}

        {/* Entry notice */}
        <div className={cn(
          'mt-4 p-4 rounded-xl border text-xs leading-relaxed',
          branch.borderColor, branch.bgColor,
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className={cn('flex-shrink-0 mt-0.5', branch.textColor)} />
            <div>
              <div className={cn('font-semibold mb-1', branch.textColor)}>How to join this branch</div>
              <p className="text-zinc-400">{branch.entryRule}</p>
              <p className="text-zinc-500 mt-1">
                All positions require an invitation or election. Citizens may declare interest via the Elections module once positions open.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function StatePage() {
  const [selected, setSelected] = useState<BranchKey | null>(null);

  const selectedBranch = BRANCHES.find(b => b.key === selected);

  const totalVacant = BRANCHES.flatMap(b => b.positions).filter(p => p.vacant).length;
  const totalPositions = BRANCHES.flatMap(b => b.positions).reduce((acc, p) => acc + (p.count || 1), 0);

  return (
    <div className="min-h-screen p-6 lg:p-8 animate-in fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Building2 className="text-gold-primary" size={28} />
          State Structure
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          The four branches of sovereign power — transparent, public, accountable
        </p>
        <div className="flex gap-4 mt-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Circle size={8} className="text-red-400 fill-red-400" /> {totalVacant} vacant positions
          </span>
          <span className="flex items-center gap-1">
            <Circle size={8} className="text-green-400 fill-green-400" /> {totalPositions - totalVacant} occupied
          </span>
        </div>
      </div>

      <div className={cn(
        'grid gap-8 transition-all duration-500',
        selected ? 'grid-cols-1 lg:grid-cols-[1fr_420px]' : 'grid-cols-1',
      )}>
        {/* Left — Wheel + Branch cards */}
        <div className="space-y-8">

          {/* SVG Wheel */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg width={400} height={400} viewBox="0 0 400 400" className="drop-shadow-2xl">
                {/* Outer ring */}
                <circle cx={200} cy={200} r={185} fill="none" stroke="#27272a" strokeWidth={1} />

                {/* Sectors */}
                {BRANCHES.map((branch, i) => (
                  <WheelSector
                    key={branch.key}
                    index={i}
                    total={BRANCHES.length}
                    color={branch.sectorColor}
                    active={selected === branch.key}
                    onClick={() => setSelected(selected === branch.key ? null : branch.key)}
                    branch={branch}
                  />
                ))}

                {/* Center circle */}
                <circle cx={200} cy={200} r={62} fill="#0a0a0a" stroke="#27272a" strokeWidth={1.5} />
                <foreignObject x={160} y={170} width={80} height={60}>
                  <div className="flex flex-col items-center justify-center text-center gap-0.5">
                    <Shield size={18} className="text-gold-primary mx-auto" />
                    <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider leading-tight">
                      INOMAD<br />KHURAL
                    </div>
                  </div>
                </foreignObject>

                {/* Labels outside sectors */}
                {BRANCHES.map((branch, i) => {
                  const angle = 360 / BRANCHES.length;
                  const midAngle = ((i * angle - 90) + angle / 2) * (Math.PI / 180);
                  const r = 192;
                  const x = 200 + r * Math.cos(midAngle);
                  const y = 200 + r * Math.sin(midAngle);
                  return (
                    <text
                      key={branch.key}
                      x={x} y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fill={selected === branch.key ? branch.sectorColor : '#52525b'}
                      fontFamily="monospace"
                      className="uppercase tracking-widest select-none"
                    >
                      {branch.name.toUpperCase()}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Instruction */}
            {!selected && (
              <p className="text-xs text-zinc-600 mt-2 animate-pulse">
                Click a sector to explore the branch
              </p>
            )}
          </div>

          {/* Branch quick-cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BRANCHES.map((branch) => {
              const Icon = branch.icon;
              const vacantCount = branch.positions.filter(p => p.vacant).reduce((acc, p) => acc + (p.count || 1), 0);
              const isActive = selected === branch.key;
              return (
                <button
                  key={branch.key}
                  onClick={() => setSelected(isActive ? null : branch.key)}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-all duration-300',
                    isActive
                      ? cn('border-opacity-60 ring-1', branch.borderColor, branch.glow)
                      : 'border-zinc-800/50 hover:border-zinc-700',
                    isActive ? branch.bgColor : 'bg-zinc-900/30 hover:bg-zinc-900/60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', branch.bgColor)}>
                      <Icon size={18} className={branch.textColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className={cn('font-semibold text-sm', branch.textColor)}>
                          {branch.name}
                        </div>
                        {vacantCount > 0 && (
                          <div className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0">
                            {vacantCount} open
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{branch.description}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={cn('flex-shrink-0 mt-1 transition-transform', branch.textColor, isActive && 'rotate-90')}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Public transparency note */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-zinc-800/40 bg-zinc-900/20 text-xs text-zinc-500">
            <Eye size={14} className="text-zinc-600 flex-shrink-0 mt-0.5" />
            <p>
              All government positions are public. Citizens may observe the work of every branch, request accountability, and participate in elections.
              Access to positions requires invitation from competent authorities — no self-appointment is possible.
            </p>
          </div>
        </div>

        {/* Right — Detail panel */}
        {selectedBranch && (
          <div className={cn(
            'rounded-xl border overflow-hidden flex flex-col',
            selectedBranch.borderColor,
            'bg-zinc-950/80',
            selectedBranch.glow,
          )} style={{ maxHeight: '80vh' }}>
            <BranchPanel
              branch={selectedBranch}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
