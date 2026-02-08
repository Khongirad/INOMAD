'use client';

import * as React from 'react';
import { Globe, MapPin, Users, Building2, TrendingUp, Plus, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Territory {
  id: string;
  name: string;
  type: 'URBAN' | 'RURAL' | 'VIRTUAL' | 'RESOURCE';
  size: number; // in sq km or virtual units
  population: number;
  owner: string;
  status: 'ACTIVE' | 'PENDING' | 'DISPUTED';
  createdAt: string;
}

// Mock territories
const mockTerritories: Territory[] = [
  {
    id: '1',
    name: 'Baikal Digital Zone',
    type: 'VIRTUAL',
    size: 1000,
    population: 234,
    owner: 'Arban Alpha',
    status: 'ACTIVE',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Irkutsk Urban District',
    type: 'URBAN',
    size: 45,
    population: 567,
    owner: 'Zuun Irkutsk',
    status: 'ACTIVE',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    name: 'Taiga Resource Area',
    type: 'RESOURCE',
    size: 2500,
    population: 89,
    owner: 'Myangan Baikal',
    status: 'PENDING',
    createdAt: '2024-02-05',
  },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'URBAN': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'RURAL': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'VIRTUAL': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'RESOURCE': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-emerald-500 bg-emerald-500/10';
    case 'PENDING': return 'text-amber-500 bg-amber-500/10';
    case 'DISPUTED': return 'text-red-500 bg-red-500/10';
    default: return 'text-zinc-400 bg-zinc-500/10';
  }
};

export default function TerritoryPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('all');

  const filteredTerritories = mockTerritories.filter((territory) => {
    const matchesSearch = territory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         territory.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || territory.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalTerritories: mockTerritories.length,
    totalArea: mockTerritories.reduce((sum, t) => sum + t.size, 0),
    totalPopulation: mockTerritories.reduce((sum, t) => sum + t.population, 0),
    activeTerritories: mockTerritories.filter(t => t.status === 'ACTIVE').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Globe className="text-emerald-500 w-8 h-8" />
            Digital Territories
          </h2>
          <p className="text-zinc-400 mt-1">
            Manage and claim territorial zones in the Siberian Confederation
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Claim Territory
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-gold-border/30 bg-gradient-to-br from-zinc-900/80 to-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-surface/20">
                <MapPin className="h-5 w-5 text-gold-primary" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Territories</div>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Globe className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Total Area</div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {stats.totalArea.toLocaleString()} km²
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase">Active</div>
                <div className="text-lg font-mono font-bold text-amber-500">
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
          <TabsTrigger value="list">Territory List</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
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
              <option value="URBAN">Urban</option>
              <option value="RURAL">Rural</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="RESOURCE">Resource</option>
            </select>
          </div>

          {/* Territory Table */}
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Territory
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Population
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTerritories.map((territory) => (
                      <tr
                        key={territory.id}
                        className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-zinc-500" />
                            <div>
                              <div className="font-medium text-white">{territory.name}</div>
                              <div className="text-xs text-zinc-500">
                                Created {new Date(territory.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-xs font-bold uppercase px-2 py-1 rounded border",
                            getTypeColor(territory.type)
                          )}>
                            {territory.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-white">
                            {territory.size.toLocaleString()} km²
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-zinc-300">
                            <Users className="h-3 w-3" />
                            <span>{territory.population.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-zinc-300">{territory.owner}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-xs font-bold uppercase px-2 py-1 rounded",
                            getStatusColor(territory.status)
                          )}>
                            {territory.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className="border-white/5 bg-zinc-900/30">
            <CardContent className="p-8">
              <div className="flex items-center justify-center h-96 text-center">
                <div>
                  <Globe className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Interactive Map Coming Soon
                  </h3>
                  <p className="text-zinc-400 max-w-md">
                    Geographic visualization of all territories will display here.
                    This will include zoomable maps with territory boundaries,
                    population density, and resource indicators.
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-zinc-400">Urban — Cities & settlements</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-zinc-400">Rural — Agricultural lands</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-zinc-400">Virtual — Digital spaces</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Resource — Natural resources</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
