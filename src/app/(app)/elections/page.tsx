'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab, Alert } from '@mui/material';
import { ElectionCard } from '@/components/elections/ElectionCard';
import { Vote, Clock, CheckCircle } from 'lucide-react';
import { getActiveElections, getUpcomingElections, castVote } from '@/lib/api';
import { toast } from 'sonner';

export default function ElectionsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [activeElections, setActiveElections] = useState<any[]>([]);
  const [upcomingElections, setUpcomingElections] = useState<any[]>([]);
  const [completedElections, setCompletedElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votedElections, setVotedElections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchElections = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both in parallel
      const [activeData, upcomingData] = await Promise.all([
        getActiveElections(),
        getUpcomingElections(),
      ]);

      setActiveElections(activeData);
      setUpcomingElections(upcomingData);

      // TODO: Fetch completed elections (need new endpoint)
      setCompletedElections([]);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch elections';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (electionId: string, candidateId: string) => {
    try {
      const result = await castVote(electionId, { candidateId });
      
      // Mark as voted
      setVotedElections(new Set([...votedElections, electionId]));

      // Refresh elections to update vote counts
      await fetchElections();

      toast.success(`Vote recorded! Candidate now has ${result.voteCount} votes`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to vote');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Выборы
      </Typography>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Vote size={20} />
              Активные ({activeElections.length})
            </Box>
          }
        />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Clock size={20} />
              Предстоящие ({upcomingElections.length})
            </Box>
          }
        />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle size={20} />
              Завершённые ({completedElections.length})
            </Box>
          }
        />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tab 0: Active Elections */}
      {currentTab === 0 && (
        <Box>
          {activeElections.length === 0 ? (
            <Alert severity="info">Нет активных выборов</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {activeElections.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  onVote={handleVote}
                  hasVoted={votedElections.has(election.id)}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1: Upcoming Elections */}
      {currentTab === 1 && (
        <Box>
          {upcomingElections.length === 0 ? (
            <Alert severity="info">Нет предстоящих выборов</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {upcomingElections.map((election) => (
                <ElectionCard key={election.id} election={election} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 2: Completed Elections */}
      {currentTab === 2 && (
        <Box>
          {completedElections.length === 0 ? (
            <Alert severity="info">Нет завершённых выборов</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {completedElections.map((election) => (
                <ElectionCard key={election.id} election={election} />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}
