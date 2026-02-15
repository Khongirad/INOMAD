'use client';

import { useState } from 'react';
import {
  Vote, Users, Calendar, TrendingUp, CheckCircle2, Crown, Lock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Candidate {
  id: string;
  candidate: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  platform?: string;
  votes: number;
}

interface Election {
  id: string;
  organization: {
    id: string;
    name: string;
    type: string;
    ownershipType?: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: Date;
  endDate: Date;
  termMonths?: number;
  isAnonymous?: boolean;
  totalVotes: number;
  turnoutRate?: number;
  winner?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  winnerVotes?: number;
  candidates: Candidate[];
}

interface ElectionCardProps {
  election: Election;
  onVote?: (electionId: string, candidateId: string) => Promise<void>;
  hasVoted?: boolean;
}

export function ElectionCard({ election, onVote, hasVoted = false }: ElectionCardProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const isActive = election.status === 'ACTIVE';
  const isCompleted = election.status === 'COMPLETED';

  const getStatusStyle = () => {
    switch (election.status) {
      case 'ACTIVE': return 'bg-emerald-500/10 text-emerald-500';
      case 'COMPLETED': return 'bg-zinc-500/10 text-zinc-400';
      case 'UPCOMING': return 'bg-blue-500/10 text-blue-400';
      case 'CANCELLED': return 'bg-red-500/10 text-red-400';
      default: return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const getStatusLabel = () => {
    switch (election.status) {
      case 'ACTIVE': return 'Voting';
      case 'COMPLETED': return 'Completed';
      case 'UPCOMING': return 'Предстоящие';
      case 'CANCELLED': return 'Отменено';
      default: return election.status;
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate || !onVote) return;
    setVoting(true);
    try {
      await onVote(election.id, selectedCandidate);
    } finally {
      setVoting(false);
    }
  };

  const totalVotes = isCompleted
    ? election.totalVotes
    : election.candidates.reduce((sum, c) => sum + c.votes, 0);

  const getCandidatePercentage = (votes: number) =>
    totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

  return (
    <Card className="border-white/5 bg-zinc-900/50 hover:border-blue-500/20 transition-all">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              {election.organization.name}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">{election.organization.type}</p>
          </div>
          <span className={cn(
            "text-xs font-bold uppercase px-2 py-1 rounded",
            getStatusStyle()
          )}>
            {getStatusLabel()}
          </span>
        </div>

        {/* Dates + Tags */}
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(election.startDate).toLocaleDateString('ru-RU')}
            {' — '}
            {new Date(election.endDate).toLocaleDateString('ru-RU')}
          </span>
          {election.termMonths && (
            <span className="px-2 py-0.5 rounded border border-white/10 text-zinc-400">
              {election.termMonths} мес.
            </span>
          )}
          {election.isAnonymous && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-blue-500/20 text-blue-400">
              <Lock className="h-3 w-3" /> Тайное
            </span>
          )}
        </div>

        {/* Winner */}
        {isCompleted && election.winner && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Crown className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="font-semibold text-emerald-400 text-sm">
                  {election.winner.firstName} {election.winner.lastName}
                </div>
                <div className="text-xs text-zinc-500">
                  {election.winnerVotes} votes ({getCandidatePercentage(election.winnerVotes || 0).toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/5" />

        {/* Candidates label */}
        <div className="text-sm font-semibold text-zinc-300">
          Candidateы ({election.candidates.length})
        </div>

        {/* Voting Mode */}
        {isActive && !hasVoted ? (
          <div className="space-y-2">
            {election.candidates.map((candidate) => (
              <label
                key={candidate.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  selectedCandidate === candidate.candidate.id
                    ? "border-blue-500/40 bg-blue-500/5"
                    : "border-white/5 bg-zinc-900/30 hover:border-white/10"
                )}
              >
                <input
                  type="radio"
                  name={`election-${election.id}`}
                  value={candidate.candidate.id}
                  checked={selectedCandidate === candidate.candidate.id}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                  className="accent-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-white">
                    {candidate.candidate.firstName} {candidate.candidate.lastName}
                  </div>
                  <div className="text-xs text-zinc-500">@{candidate.candidate.username}</div>
                  {candidate.platform && (
                    <div className="text-xs text-zinc-400 mt-0.5">{candidate.platform}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        ) : election.isAnonymous && isActive ? (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-sm text-blue-400 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Тайное voting — results после завершения
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Candidates: {election.candidates.length}
            </p>
          </div>
        ) : (
          /* Results Mode */
          <div className="space-y-3">
            {election.candidates
              .sort((a, b) => b.votes - a.votes)
              .map((candidate) => {
                const percentage = getCandidatePercentage(candidate.votes);
                const isWinner = isCompleted && candidate.candidate.id === election.winner?.id;
                return (
                  <div key={candidate.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={cn(
                        "text-zinc-200",
                        isWinner && "font-bold text-emerald-400"
                      )}>
                        {candidate.candidate.firstName} {candidate.candidate.lastName}
                        {isWinner && ' 👑'}
                      </span>
                      <span className="text-zinc-500 font-mono text-xs">
                        {candidate.votes} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          isWinner ? "bg-emerald-500" : "bg-blue-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Stats footer */}
        <div className="pt-2 text-xs text-zinc-500 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Voteов: {totalVotes}
          {isCompleted && election.turnoutRate && (
            <> · Явка: {election.turnoutRate.toFixed(1)}%</>
          )}
        </div>

        {/* Vote button */}
        {isActive && !hasVoted && (
          <Button
            className="w-full"
            onClick={handleVote}
            disabled={!selectedCandidate || voting}
          >
            <Vote className="mr-2 h-4 w-4" />
            {voting ? 'Voting...' : 'Проvotesать'}
          </Button>
        )}

        {/* Already voted */}
        {hasVoted && isActive && (
          <div className="w-full text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> You проvotesали
          </div>
        )}
      </CardContent>
    </Card>
  );
}
