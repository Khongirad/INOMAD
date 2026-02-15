'use client';

import * as React from 'react';
import { Globe, MapPin, Users, Building2, TrendingUp, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/lib/api';
import type { HierarchyNode, OrganizationType } from '@/lib/types/models';

const TYPE_LABELS: Record<string, string> = {
  ARBAN: 'Arban',
  ZUN: 'Zuun',
  MYANGAN: 'Myangan',
  TUMEN: 'Tumen',
  REPUBLIC: 'Republic',
  CONFEDERATION: 'Confederation',
  GUILD: 'Guild',
  COOPERATIVE: 'Cooperative',
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ARBAN': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'ZUN': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'MYANGAN': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'TUMEN': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'REPUBLIC': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    case 'CONFEDERATION': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
};

export default function TerritoryPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');

  const { data: orgs = [], isLoading } = useOrganizations({
    type: filterType !== 'all' ? (filterType as OrganizationType) : undefined,
    search: searchTerm || undefined,
  });

  const stats = {
    totalTerritories: orgs.length,
    totalPopulation: orgs.reduce((sum: number, t: HierarchyNode) => sum + t.memberCount, 0),
    activeTerritories: orgs.length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Globe className="text-emerald-500 w-8 h-8" />
            Territories
          </h2>
          <p className="text-zinc-400 mt-1">
            Territorial units and organizations of the Confederation
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <MapPin className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total territories</div>
                <div className="text-lg font-mono font-bold text-white">
                  {stats.totalTerritories}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Population</div>
                <div className="text-lg font-mono font-bold text-white">
                  {stats.totalPopulation.toLocaleString()}
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
                  {stats.activeTerritories}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="list">List territories</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search territories..."
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
              <option value="ARBAN">Arban</option>
              <option value="ZUN">Zuun</option>
              <option value="MYANGAN">Myangan</option>
              <option value="TUMEN">Tumen</option>
              <option value="REPUBLIC">Republic</option>
            </select>
          </div>

          {/* Territory Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Globe className="h-12 w-12 mx-auto opacity-30 mb-2" />
              No territories found
            </div>
          ) : (
            <Card className="border-white/5 bg-zinc-900/30">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-white/5">
                      <tr>
                        {['Territory', 'Type', 'Members', 'Head', 'Rating'].map((h) => (
                          <th key={h} className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {orgs.map((org: HierarchyNode) => (
                        <tr key={org.id} className="hover:bg-zinc-800/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <MapPin className="h-4 w-4 text-zinc-500" />
                              <span className="font-medium text-white">{org.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-xs font-bold uppercase px-2 py-1 rounded border",
                              getTypeColor(org.type)
                            )}>
                              {TYPE_LABELS[org.type] || org.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-zinc-300">
                              <Users className="h-3 w-3" />
                              <span>{org.memberCount} / {org.maxMembers}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-300">
                            {org.leader?.username || '—'}
                          </td>
                          <td className="px-6 py-4 text-zinc-300">
                            {org.ratings?.overall?.toFixed(1) || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-8">
              <div className="flex items-center justify-center h-96 text-center">
                <div>
                  <Globe className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Interactive map — coming soon
                  </h3>
                  <p className="text-zinc-400 max-w-md">
                    Visualization of territories with borders, population density and resources.
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
          <CardTitle className="text-sm text-zinc-300">Territory Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(TYPE_LABELS).slice(0, 6).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', {
                  'bg-emerald-500': type === 'ARBAN',
                  'bg-blue-500': type === 'ZUN',
                  'bg-purple-500': type === 'MYANGAN',
                  'bg-amber-500': type === 'TUMEN',
                  'bg-rose-500': type === 'REPUBLIC',
                  'bg-cyan-500': type === 'CONFEDERATION',
                })} />
                <span className="text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
