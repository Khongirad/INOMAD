'use client';

import * as React from 'react';
import { Vote, Clock, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ElectionCard } from '@/components/elections/ElectionCard';
import { getActiveElections, getUpcomingElections, castVote } from '@/lib/api';
import { toast } from 'sonner';

export default function ElectionsPage() {
  const [activeElections, setActiveElections] = React.useState<any[]>([]);
  const [upcomingElections, setUpcomingElections] = React.useState<any[]>([]);
  const [completedElections, setCompletedElections] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [votedElections, setVotedElections] = React.useState<Set<string>>(new Set());

  const fetchElections = React.useCallback(async () => {
    setLoading(true);
    try {
      const [activeData, upcomingData] = await Promise.all([
        getActiveElections(),
        getUpcomingElections(),
      ]);
      setActiveElections(activeData);
      setUpcomingElections(upcomingData);
      setCompletedElections([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load elections');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const handleVote = async (electionId: string, candidateId: string) => {
    try {
      const result = await castVote(electionId, { candidateId });
      setVotedElections(new Set([...votedElections, electionId]));
      await fetchElections();
      toast.success(`Vote accepted! Candidate has ${result.voteCount} votes`);
    } catch (err: any) {
      toast.error(err.message || 'Voting error');
    }
  };

  const EmptyState = ({ text }: { text: string }) => (
    <Card className="border-white/5 bg-zinc-900/30">
      <CardContent className="p-8 text-center">
        <Vote className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400">{text}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Vote className="text-blue-500 w-8 h-8" />
            Elections
          </h2>
          <p className="text-zinc-400 mt-1">
            Voting, candidates, and election results
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchElections}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-white/5">
          <TabsTrigger value="active" className="gap-1.5">
            <Vote className="h-4 w-4" />
            Active ({activeElections.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Upcoming ({upcomingElections.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedElections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="text-center text-zinc-500 py-12 animate-pulse">Loading...</div>
          ) : activeElections.length === 0 ? (
            <EmptyState text="No active elections" />
          ) : (
            <div className="space-y-4">
              {activeElections.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  onVote={handleVote}
                  hasVoted={votedElections.has(election.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingElections.length === 0 ? (
            <EmptyState text="No upcoming elections" />
          ) : (
            <div className="space-y-4">
              {upcomingElections.map((election) => (
                <ElectionCard key={election.id} election={election} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedElections.length === 0 ? (
            <EmptyState text="No completed elections" />
          ) : (
            <div className="space-y-4">
              {completedElections.map((election) => (
                <ElectionCard key={election.id} election={election} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
