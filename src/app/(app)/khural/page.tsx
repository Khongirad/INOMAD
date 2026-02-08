'use client';

import * as React from 'react';
import { Building2, Users, TrendingUp, CheckCircle2, Clock, ChevronRight, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ArbanNode {
  id: string;
  name: string;
  level: 'TUMEN' | 'MYANGAN' | 'ZUUN' | 'ARBAN';
  citizens: number;
  completion: number;
  status: 'ACTIVE' | 'FORMING' | 'INACTIVE';
  children?: ArbanNode[];
}

// Mock data - hierarchical structure
const mockStateMap: ArbanNode = {
  id: 'tumen-1',
  name: 'Tumen Siberia',
  level: 'TUMEN',
  citizens: 1234,
  completion: 12.34,
  status: 'FORMING',
  children: [
    {
      id: 'myangan-1',
      name: 'Myangan Baikal',
      level: 'MYANGAN',
      citizens: 234,
      completion: 23.4,
      status: 'FORMING',
      children: [
        {
          id: 'zuun-1',
          name: 'Zuun Irkutsk',
          level: 'ZUUN',
          citizens: 89,
          completion: 89,
          status: 'ACTIVE',
          children: [
            {
              id: 'arban-1',
              name: 'Arban Alpha',
              level: 'ARBAN',
              citizens: 10,
              completion: 100,
              status: 'ACTIVE',
            },
            {
              id: 'arban-2',
              name: 'Arban Beta',
              level: 'ARBAN',
              citizens: 8,
              completion: 80,
              status: 'FORMING',
            },
          ],
        },
        {
          id: 'zuun-2',
          name: 'Zuun Ulan-Ude',
          level: 'ZUUN',
          citizens: 45,
          completion: 45,
          status: 'FORMING',
        },
      ],
    },
  ],
};

const getLevelColor = (level: string) => {
  switch (level) {
    case 'TUMEN': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'MYANGAN': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'ZUUN': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'ARBAN': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-500';
    case 'FORMING': return 'text-amber-500';
    case 'INACTIVE': return 'text-zinc-500';
    default: return 'text-zinc-400';
  }
};

function ArbanCard({ node, depth = 0 }: { node: ArbanNode; depth?: number }) {
  const [expanded, setExpanded] = React.useState(depth < 2);

  return (
    <div className="space-y-3">
      <Card 
        className={cn(
          "border-white/5 bg-zinc-900/50 hover:border-amber-500/30 transition-all cursor-pointer",
          depth === 0 && "border-amber-500/20"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {node.children && node.children.length > 0 && (
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 text-zinc-500 transition-transform",
                    expanded && "rotate-90"
                  )} 
                />
              )}
              <Building2 className={cn("h-5 w-5", getStatusColor(node.status))} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{node.name}</h3>
                  <span className={cn(
                    "text-xs font-bold uppercase px-2 py-0.5 rounded border",
                    getLevelColor(node.level)
                  )}>
                    {node.level}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Users className="h-3 w-3" />
                    {node.citizens} citizens
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <TrendingUp className="h-3 w-3" />
                    {node.completion}% complete
                  </span>
                </div>
              </div>
            </div>
            <div className={cn(
              "text-xs font-bold uppercase px-2 py-1 rounded",
              getStatusColor(node.status)
            )}>
              {node.status}
            </div>
          </div>
        </CardContent>
      </Card>

      {expanded && node.children && node.children.length > 0 && (
        <div className="ml-6 pl-4 border-l-2 border-zinc-800 space-y-3">
          {node.children.map((child) => (
            <ArbanCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function KhuralPage() {
  const stats = {
    totalCitizens: 1234,
    activeArbans: 12,
    formingArbans: 23,
    completionRate: 34.5,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Building2 className="text-amber-500 w-8 h-8" />
            State Map — Hierarchical Structure
          </h2>
          <p className="text-zinc-400 mt-1">
            Tumen → Myangan → Zuun → Arban (10,000 → 1,000 → 100 → 10)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <Users className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Citizens</div>
                <div className="text-lg font-mono font-bold text-white">
                  {stats.totalCitizens.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Active Arbans</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {stats.activeArbans}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Forming</div>
                <div className="text-lg font-mono font-bold text-amber-500">
                  {stats.formingArbans}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Completion</div>
                <div className="text-lg font-mono font-bold text-white">
                  {stats.completionRate}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchical View */}
      <Tabs defaultValue="hierarchy" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="hierarchy">Hierarchical View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">
                Complete State Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ArbanCard node={mockStateMap} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-8">
              <div className="flex items-center justify-center h-96 text-center">
                <div>
                  <MapPin className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Geographic Map View
                  </h3>
                  <p className="text-zinc-400 max-w-md">
                    Interactive map visualization coming soon. Will show territorial
                    distribution of Arbans across Siberian regions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <Card className="border-white/5 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-300">Structure Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-zinc-400">Tumen (10,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-zinc-400">Myangan (1,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">Zuun (100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Arban (10)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
