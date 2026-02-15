'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RateOrganizationDialog } from '@/components/organizations/RateOrganizationDialog';
import {
  Trophy,
  Star,
  Users,
  Building2,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface LeaderboardEntry {
  id: string;
  name: string;
  type: string;
  rating: number;
  ratingCount: number;
  memberCount: number;
  rank: number;
  previousRank?: number;
  financialRating?: number;
  trustRating?: number;
  qualityRating?: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rating');
  const [search, setSearch] = useState('');
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizations/leaderboard?sortBy=${sortBy}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setEntries(data.data || data || []);
    } catch {
      toast.error('Error loading ratings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const handleRate = async (data: { financialScore: number; trustScore: number; qualityScore: number }) => {
    if (!selectedOrg) return;
    const res = await fetch(`/api/organizations/${selectedOrg.id}/rate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed');
    toast.success('Rating submitted');
    fetchLeaderboard();
  };

  const openRateDialog = (org: { id: string; name: string }) => {
    setSelectedOrg(org);
    setRateDialogOpen(true);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const getRankChange = (entry: LeaderboardEntry) => {
    if (!entry.previousRank) return null;
    const diff = entry.previousRank - entry.rank;
    if (diff > 0) return <span className="text-green-600 flex items-center gap-0.5 text-xs"><TrendingUp className="h-3 w-3" />+{diff}</span>;
    if (diff < 0) return <span className="text-red-600 flex items-center gap-0.5 text-xs"><TrendingDown className="h-3 w-3" />{diff}</span>;
    return <span className="text-muted-foreground flex items-center text-xs"><Minus className="h-3 w-3" /></span>;
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="h-7 w-7 text-yellow-500" />
        <h1 className="text-2xl font-bold">Organization Ratings</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Overall Rating</SelectItem>
            <SelectItem value="financial">Finance</SelectItem>
            <SelectItem value="trust">Trust</SelectItem>
            <SelectItem value="quality">Quality</SelectItem>
            <SelectItem value="members">Members</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No organizations found</p>
        </div>
      ) : (
        /* Leaderboard Table */
        <div className="space-y-2">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Organization</div>
            <div className="col-span-1 text-center">⭐</div>
            <div className="col-span-1 text-center">💰</div>
            <div className="col-span-1 text-center">🤝</div>
            <div className="col-span-1 text-center">📊</div>
            <div className="col-span-1 text-center">👥</div>
            <div className="col-span-2 text-center">Action</div>
          </div>

          {filteredEntries.map((entry) => (
            <Card key={entry.id} className={`transition-all hover:shadow-md ${entry.rank <= 3 ? 'border-yellow-200 dark:border-yellow-800' : ''}`}>
              <CardContent className="py-3 px-4">
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Rank */}
                  <div className="col-span-1 flex items-center gap-1">
                    {getRankIcon(entry.rank)}
                    {getRankChange(entry)}
                  </div>

                  {/* Name */}
                  <div className="col-span-4">
                    <button
                      className="text-left hover:text-primary transition-colors"
                      onClick={() => router.push(`/organizations/${entry.id}`)}
                    >
                      <p className="font-semibold text-sm">{entry.name}</p>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{entry.type}</Badge>
                    </button>
                  </div>

                  {/* Rating */}
                  <div className="col-span-1 text-center">
                    <span className="font-bold text-sm">{entry.rating?.toFixed(1) || '—'}</span>
                    <p className="text-[10px] text-muted-foreground">{entry.ratingCount}</p>
                  </div>

                  {/* Financial */}
                  <div className="col-span-1 text-center text-sm">
                    {entry.financialRating?.toFixed(1) || '—'}
                  </div>

                  {/* Trust */}
                  <div className="col-span-1 text-center text-sm">
                    {entry.trustRating?.toFixed(1) || '—'}
                  </div>

                  {/* Quality */}
                  <div className="col-span-1 text-center text-sm">
                    {entry.qualityRating?.toFixed(1) || '—'}
                  </div>

                  {/* Members */}
                  <div className="col-span-1 text-center text-sm flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {entry.memberCount}
                  </div>

                  {/* Action */}
                  <div className="col-span-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => openRateDialog({ id: entry.id, name: entry.name })}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Rate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rate Dialog */}
      {selectedOrg && (
        <RateOrganizationDialog
          open={rateDialogOpen}
          onClose={() => {
            setRateDialogOpen(false);
            setSelectedOrg(null);
          }}
          organizationName={selectedOrg.name}
          organizationId={selectedOrg.id}
          onSubmit={handleRate}
        />
      )}
    </div>
  );
}
