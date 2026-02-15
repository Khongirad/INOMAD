'use client';

import React, { useState } from 'react';
import {
  Building2, Users, ChevronRight, Loader2, Plus, MapPin,
  TrendingUp, CheckCircle2, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useKhuralGroups } from '@/lib/api';
import type { KhuralGroup, KhuralLevel } from '@/lib/types/models';

const LEVEL_COLORS: Record<string, string> = {
  ARBAN: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ZUUN: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  MYANGAN: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  TUMEN: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const LEVEL_LABELS: Record<string, string> = {
  ARBAN: 'Arban (10)',
  ZUUN: 'Zuun (100)',
  MYANGAN: 'Myangan (1 000)',
  TUMEN: 'Tumen (10 000)',
};

const LEVEL_SIZES: Record<string, number> = {
  ARBAN: 10,
  ZUUN: 100,
  MYANGAN: 1000,
  TUMEN: 10000,
};

function GroupCard({ group }: { group: KhuralGroup }) {
  const [expanded, setExpanded] = useState(false);
  const color = LEVEL_COLORS[group.level] || 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  const targetSize = LEVEL_SIZES[group.level] || 10;
  const completion = Math.min(100, (group.memberCount / targetSize) * 100);

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-500" />
            <h3 className="font-semibold text-zinc-100">{group.name}</h3>
          </div>
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', color)}>
            {LEVEL_LABELS[group.level] || group.level}
          </span>
        </div>

        <div className="flex gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {group.memberCount} / {group.maxSeats || targetSize}
          </span>
          <span className="flex items-center gap-1">
            {completion >= 100 ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <Clock className="h-3 w-3 text-amber-400" />
            )}
            {completion.toFixed(0)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              completion >= 100
                ? 'bg-emerald-500'
                : completion >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${completion}%` }}
          />
        </div>

        {/* Seats */}
        {group.seats && group.seats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {group.seats.slice(0, 10).map((seat, i) => (
              <span
                key={i}
                title={seat.user?.username || `Seat ${seat.index + 1}`}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold',
                  seat.userId
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-zinc-800 text-zinc-600 border border-zinc-700',
                )}
              >
                {seat.index + 1}
              </span>
            ))}
            {group.seats.length > 10 && (
              <span className="text-xs text-zinc-500 self-center ml-1">
                +{group.seats.length - 10}
              </span>
            )}
          </div>
        )}

        {/* Children */}
        {group.children && group.children.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              <ChevronRight
                className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')}
              />
              {group.children.length} subgroups
            </button>
            {expanded && (
              <div className="ml-4 mt-2 space-y-2 border-l border-zinc-800 pl-3">
                {group.children.map((child) => (
                  <GroupCard key={child.id} group={child} />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function KhuralPage() {
  const [filterLevel, setFilterLevel] = useState<KhuralLevel | 'ALL'>('ALL');
  const { data: groups = [], isLoading } = useKhuralGroups(
    filterLevel !== 'ALL' ? filterLevel : undefined,
  );

  const stats = {
    total: groups.length,
    arbans: groups.filter((g: KhuralGroup) => g.level === 'ARBAN').length,
    zuuns: groups.filter((g: KhuralGroup) => g.level === 'ZUUN').length,
    myangans: groups.filter((g: KhuralGroup) => g.level === 'MYANGAN').length,
    tumens: groups.filter((g: KhuralGroup) => g.level === 'TUMEN').length,
    totalMembers: groups.reduce((sum: number, g: KhuralGroup) => sum + g.memberCount, 0),
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Building2 className="text-amber-500 w-8 h-8" />
            Khural
          </h2>
          <p className="text-zinc-400 mt-1">
            Hierarchical self-governance system: Arban → Zuun → Myangan → Tumen
          </p>
        </div>
      </div>

      {/* Hierarchy visual */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-zinc-200 mb-3">🏛️ Structure Khuralа</p>
          <div className="flex items-center justify-between">
            {(['ARBAN', 'ZUUN', 'MYANGAN', 'TUMEN'] as const).map((level, i) => {
              const count =
                level === 'ARBAN' ? stats.arbans :
                level === 'ZUUN' ? stats.zuuns :
                level === 'MYANGAN' ? stats.myangans :
                stats.tumens;
              return (
                <React.Fragment key={level}>
                  {i > 0 && (
                    <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                  )}
                  <div className="text-center flex-1">
                    <div className={cn(
                      'text-xs font-bold px-2 py-1 rounded border inline-block',
                      LEVEL_COLORS[level],
                    )}>
                      {LEVEL_LABELS[level]}
                    </div>
                    <div className="text-lg font-bold text-white mt-1">{count}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <span className="text-sm text-zinc-400">
              Total members: <strong className="text-white">{stats.totalMembers}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total groups', value: stats.total, cls: 'text-blue-400' },
          { label: 'Arbanов', value: stats.arbans, cls: 'text-emerald-400' },
          { label: 'Zuunов', value: stats.zuuns, cls: 'text-blue-400' },
          { label: 'Myanganов / Tumenов', value: stats.myangans + stats.tumens, cls: 'text-purple-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-3 flex justify-between items-center">
              <div>
                <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['ALL', 'ARBAN', 'ZUUN', 'MYANGAN', 'TUMEN'] as const).map((level) => (
          <Button
            key={level}
            size="sm"
            variant={filterLevel === level ? undefined : 'outline'}
            className={cn(
              filterLevel === level
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'border-zinc-700 text-zinc-300',
            )}
            onClick={() => setFilterLevel(level)}
          >
            {level === 'ALL' ? 'All' : LEVEL_LABELS[level]}
          </Button>
        ))}
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Building2 className="h-12 w-12 mx-auto opacity-30 mb-2" />
          Groups not yet
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group: KhuralGroup) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      {/* Info */}
      <Card className="border-amber-500/20 bg-amber-950/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 flex-shrink-0">
              <Building2 className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-200 mb-1">About the Khural Systemа</h4>
              <p className="text-sm text-amber-100/70">
                Khural — the foundation of self-governance. 10 citizens form Arban, 10 Arbanов — Zuun (100),
                10 Zuunов — Myangan (1 000), 10 Myanganов — Tumen (10 000). Each уровень
                elects its leaderа-decurion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
