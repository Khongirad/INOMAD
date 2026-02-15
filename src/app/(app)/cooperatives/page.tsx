'use client';

import * as React from 'react';
import { Users, Building2, Briefcase, Package, TrendingUp, Plus, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGuilds, useJoinGuild } from '@/lib/api';
import type { Guild, GuildType } from '@/lib/types/models';

const getTypeColor = (type: string) => {
  switch (type) {
    case 'CLAN': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'PROFESSION': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'ORGANIZATION': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'GOVERNMENT': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
};

const TYPE_LABELS: Record<string, string> = {
  CLAN: 'Clan',
  PROFESSION: 'Guild',
  ORGANIZATION: 'Organization',
  GOVERNMENT: 'State',
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'CLAN': return Briefcase;
    case 'PROFESSION': return Package;
    case 'ORGANIZATION': return TrendingUp;
    case 'GOVERNMENT': return Users;
    default: return Building2;
  }
};

export default function CooperativesPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');

  const { data: guilds = [], isLoading } = useGuilds(
    filterType !== 'all' ? (filterType as GuildType) : undefined,
  );
  const joinMutation = useJoinGuild();

  const filteredGuilds = guilds.filter((g: Guild) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    totalCooperatives: guilds.length,
    totalMembers: guilds.reduce((sum: number, c: Guild) => sum + c.memberCount, 0),
    activeGuilds: guilds.length,
    totalTreasury: guilds.reduce((sum: number, c: Guild) => sum + (c.treasury || 0), 0),
  };

  const handleJoin = async (id: string) => {
    try {
      await joinMutation.mutateAsync(id);
      toast.success('You joined the cooperative');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
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
            Guilds, clanы, professional unions и state organizations
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Create cooperative
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
                <div className="text-xs text-zinc-500 uppercase">Total</div>
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
                <div className="text-xs text-zinc-500 uppercase">Members</div>
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
                  {stats.activeGuilds}
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
                <div className="text-xs text-zinc-500 uppercase">Treasury</div>
                <div className="text-lg font-mono font-bold text-white">
                  {(stats.totalTreasury / 1000).toFixed(0)}K ALT
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
          <option value="CLAN">Clanы</option>
          <option value="PROFESSION">Guilds</option>
          <option value="ORGANIZATION">Organizations</option>
          <option value="GOVERNMENT">State</option>
        </select>
      </div>

      {/* Cooperatives Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : filteredGuilds.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Building2 className="h-12 w-12 mx-auto opacity-30 mb-2" />
          No cooperatives
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuilds.map((guild: Guild) => {
            const Icon = getTypeIcon(guild.type);
            return (
              <Card
                key={guild.id}
                className="border-white/5 bg-zinc-900/50 hover:border-purple-500/30 transition-all cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                        <Icon className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">{guild.name}</CardTitle>
                        <span className={cn(
                          "text-xs font-bold uppercase px-2 py-0.5 rounded border mt-1 inline-block",
                          getTypeColor(guild.type)
                        )}>
                          {TYPE_LABELS[guild.type] || guild.type}
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
                    <span className="font-mono text-white">
                      {guild.memberCount} / {guild.maxMembers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Treasury</span>
                    <span className="font-mono text-gold-primary">
                      {(guild.treasury / 1000).toFixed(0)}K ALT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Head</span>
                    <span className="text-zinc-300">
                      {guild.leader?.username || '—'}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      {new Date(guild.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 text-purple-400 text-xs"
                      onClick={() => handleJoin(guild.id)}
                      disabled={joinMutation.isPending}
                    >
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                Cooperatives — self-governing organizations, где memberи pool resources
                and skills. Clanы — ancestral unions, Guilds are professional, Organizations are hierarchical structures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
