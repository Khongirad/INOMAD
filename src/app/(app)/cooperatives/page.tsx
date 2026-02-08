'use client';

import * as React from 'react';
import { Users, Building2, Briefcase, Package, TrendingUp, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Cooperative {
  id: string;
  name: string;
  type: 'GUILD' | 'PRODUCTION' | 'TRADE' | 'SERVICE';
  members: number;
  foundedDate: string;
  revenue: number;
  status: 'ACTIVE' | 'FORMING' | 'INACTIVE';
}

// Mock cooperatives
const mockCooperatives: Cooperative[] = [
  {
    id: '1',
    name: 'Baikal Software Guild',
    type: 'GUILD',
    members: 45,
    foundedDate: '2023-06-15',
    revenue: 125000,
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Siberian Crafts Collective',
    type: 'PRODUCTION',
    members: 23,
    foundedDate: '2023-09-20',
    revenue: 78000,
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Digital Trade Network',
    type: 'TRADE',
    members: 67,
    foundedDate: '2023-11-10',
    revenue: 234000,
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Community Services Hub',
    type: 'SERVICE',
    members: 12,
    foundedDate: '2024-01-05',
    revenue: 34000,
    status: 'FORMING',
  },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'GUILD': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'PRODUCTION': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'TRADE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'SERVICE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'GUILD': return Briefcase;
    case 'PRODUCTION': return Package;
    case 'TRADE': return TrendingUp;
    case 'SERVICE': return Users;
    default: return Building2;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10';
    case 'FORMING': return 'text-amber-500 bg-amber-500/10';
    case 'INACTIVE': return 'text-zinc-500 bg-zinc-500/10';
    default: return 'text-zinc-400 bg-zinc-500/10';
  }
};

export default function CooperativesPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');

  const filteredCooperatives = mockCooperatives.filter((coop) => {
    const matchesSearch = coop.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || coop.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalCooperatives: mockCooperatives.length,
    totalMembers: mockCooperatives.reduce((sum, c) => sum + c.members, 0),
    activeCooperatives: mockCooperatives.filter(c => c.status === 'ACTIVE').length,
    totalRevenue: mockCooperatives.reduce((sum, c) => sum + c.revenue, 0),
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="text-purple-500 w-8 h-8" />
            Cooperatives
          </h2>
          <p className="text-zinc-400 mt-1">
            Guilds, production networks, services, and trade organizations
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Create Cooperative
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <Building2 className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Co-ops</div>
                <div className="text-lg font-mono font-bold text-white">
                  {stats.totalCooperatives}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Members</div>
                <div className="text-lg font-mono font-bold text-purple-500">
                  {stats.totalMembers}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Active</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {stats.activeCooperatives}
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
                <div className="text-xs text-zinc-500 uppercase">Revenue</div>
                <div className="text-lg font-mono font-bold text-white">
                  {(stats.totalRevenue / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search cooperatives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white"
        >
          <option value="all">All Types</option>
          <option value="GUILD">Guilds</option>
          <option value="PRODUCTION">Production</option>
          <option value="TRADE">Trade</option>
          <option value="SERVICE">Service</option>
        </select>
      </div>

      {/* Cooperatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCooperatives.map((coop) => {
          const Icon = getTypeIcon(coop.type);
          return (
            <Card
              key={coop.id}
              className="border-white/5 bg-zinc-900/50 hover:border-purple-500/30 transition-all cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                      <Icon className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">{coop.name}</CardTitle>
                      <span className={cn(
                        "text-xs font-bold uppercase px-2 py-0.5 rounded border mt-1 inline-block",
                        getTypeColor(coop.type)
                      )}>
                        {coop.type}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Users className="h-3 w-3" />
                    <span>Members</span>
                  </div>
                  <span className="font-mono text-white">{coop.members}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Revenue</span>
                  <span className="font-mono text-gold-primary">
                    {(coop.revenue / 1000).toFixed(0)}K ALT
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Founded</span>
                  <span className="text-zinc-300">
                    {new Date(coop.foundedDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <span className={cn(
                    "text-xs font-bold uppercase px-2 py-1 rounded",
                    getStatusColor(coop.status)
                  )}>
                    {coop.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Banner */}
      <Card className="border-purple-500/20 bg-purple-950/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 flex-shrink-0">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-200 mb-1">About Cooperatives</h4>
              <p className="text-sm text-purple-100/70">
                Cooperatives are self-governed organizations where members pool resources
                and skills. Guilds focus on professional services, Production co-ops manufacture
                goods, Trade networks facilitate commerce, and Service hubs provide community services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
