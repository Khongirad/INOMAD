'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Landmark,
  Vote,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  MinusCircle,
  Play,
  Square,
  Plus,
  Loader2,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-600',
  IN_PROGRESS: 'bg-orange-500',
  COMPLETED: 'bg-green-600',
  CANCELLED: 'bg-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function ParliamentPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [voteDialog, setVoteDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    level: 'REPUBLICAN',
    entityId: '',
    title: '',
    description: '',
    sessionDate: '',
    quorumRequired: 1,
  });
  const [voteForm, setVoteForm] = useState({ vote: 'FOR', comment: '' });

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parliament/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (sessionId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/parliament/sessions/${sessionId}/results`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data);
      setSelectedSession(data.session);
    }
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/parliament/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        setCreateDialog(false);
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }
  };

  const handleAction = async (sessionId: string, action: 'start' | 'complete') => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/parliament/sessions/${sessionId}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      fetchSessions();
    } catch (err) {
      console.error(`Failed to ${action} session`, err);
    }
  };

  const handleVote = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/parliament/sessions/${sessionId}/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(voteForm),
      });
      setVoteDialog(false);
      fetchResults(sessionId);
    } catch (err) {
      console.error('Failed to vote', err);
    }
  };

  const scheduled = sessions.filter(s => s.status === 'SCHEDULED');
  const inProgress = sessions.filter(s => s.status === 'IN_PROGRESS');
  const completed = sessions.filter(s => s.status === 'COMPLETED');

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark className="h-7 w-7 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold">Parliament / Parliament</h1>
            <p className="text-sm text-muted-foreground">
              Khural — sessions and voting by Tumen leaders
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialog(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Convene Session
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap mb-6">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="text-2xl font-bold text-blue-500">{scheduled.length}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-orange-500">{inProgress.length}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-500">{completed.length}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm mb-4">
        <strong>Only Tumen leaders</strong> have the right to vote in Khural.
        In the Republican Khural, Tumen leaders of the Republic vote.
      </div>

      {/* Empty state */}
      {sessions.length === 0 && !loading && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
          ℹ️ No scheduled sessions. Convene the first Khural session!
        </div>
      )}

      {/* Sessions list */}
      {sessions.map((session: any) => (
        <Card
          key={session.id}
          className={`mb-3 cursor-pointer hover:border-muted-foreground/50 transition-colors ${
            selectedSession?.id === session.id ? 'border-yellow-500' : ''
          }`}
          onClick={() => fetchResults(session.id)}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`text-[10px] font-bold text-white ${
                session.level === 'REPUBLICAN' ? 'bg-blue-600' : 'bg-yellow-600'
              }`}>
                {session.level === 'REPUBLICAN' ? 'Republic' : 'Confederation'}
              </Badge>
              <span className="font-semibold flex-1">{session.title}</span>
              <Badge className={`text-[10px] text-white ${STATUS_COLORS[session.status]}`}>
                {STATUS_LABELS[session.status] || session.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(session.sessionDate).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <span className="flex items-center gap-1">
                <Vote className="h-3.5 w-3.5" />
                {session._count?.votes || 0} votes
              </span>
              {session.convenedBy && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Convened by: {session.convenedBy.username}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              {session.status === 'SCHEDULED' && (
                <Button
                  size="sm"
                  className="gap-1 bg-orange-500 hover:bg-orange-600 text-xs"
                  onClick={e => { e.stopPropagation(); handleAction(session.id, 'start'); }}
                >
                  <Play className="h-3.5 w-3.5" />
                  Start
                </Button>
              )}
              {session.status === 'IN_PROGRESS' && (
                <>
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700 text-xs"
                    onClick={e => { e.stopPropagation(); setSelectedSession(session); setVoteDialog(true); }}
                  >
                    <Vote className="h-3.5 w-3.5" />
                    Vote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={e => { e.stopPropagation(); handleAction(session.id, 'complete'); }}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Complete
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Results panel */}
      {results && (
        <Card className="mt-6 border-yellow-500">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-yellow-500 mb-4">
              📊 Results: {results.session?.title}
            </h3>

            <div className="flex gap-8 mb-4">
              <div className="text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
                <p className="text-2xl font-bold text-green-500">{results.results?.for || 0}</p>
                <p className="text-xs text-muted-foreground">For</p>
              </div>
              <div className="text-center">
                <XCircle className="h-6 w-6 text-red-500 mx-auto" />
                <p className="text-2xl font-bold text-red-500">{results.results?.against || 0}</p>
                <p className="text-xs text-muted-foreground">Against</p>
              </div>
              <div className="text-center">
                <MinusCircle className="h-6 w-6 text-orange-500 mx-auto" />
                <p className="text-2xl font-bold text-orange-500">{results.results?.abstain || 0}</p>
                <p className="text-xs text-muted-foreground">Abstained</p>
              </div>
            </div>

            <Badge className={`text-sm font-bold mb-4 ${
              results.results?.passed ? 'bg-green-800' : 'bg-red-800'
            }`}>
              {results.results?.passed ? '✅ PASSED' : '❌ NOT PASSED'}
            </Badge>

            {results.session?.resolution && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm mt-3">
                <strong>Resolution:</strong> {results.session.resolution}
              </div>
            )}

            <div className="border-t border-border my-4" />

            <p className="text-xs font-medium text-muted-foreground mb-2">
              Votes ({results.votes?.length || 0})
            </p>
            {results.votes?.map((v: any) => (
              <div key={v.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/30 mb-1">
                {v.vote === 'FOR' && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                {v.vote === 'AGAINST' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                {v.vote === 'ABSTAIN' && <MinusCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                <span className="text-sm">
                  {v.voter?.username} ({v.tumen?.name})
                </span>
                {v.comment && (
                  <span className="text-xs text-muted-foreground ml-auto">"{v.comment}"</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create Session Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convene Session Khural</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={createForm.level} onValueChange={v => setCreateForm({ ...createForm, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPUBLICAN">Republican Khural</SelectItem>
                  <SelectItem value="CONFEDERATIVE">Confederation Khural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Republic/Confederation ID</Label>
              <Input value={createForm.entityId} onChange={e => setCreateForm({ ...createForm, entityId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Topic sessions</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date and Time</Label>
              <Input type="datetime-local" value={createForm.sessionDate} onChange={e => setCreateForm({ ...createForm, sessionDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Quorum (min. votes)</Label>
              <Input type="number" value={createForm.quorumRequired} onChange={e => setCreateForm({ ...createForm, quorumRequired: parseInt(e.target.value) || 1 })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">Convene</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialog} onOpenChange={setVoteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Voting</DialogTitle>
          </DialogHeader>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm mb-2">
            ⚠️ You are voting as a Tumen leader. One vote per session.
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your vote</Label>
              <Select value={voteForm.vote} onValueChange={v => setVoteForm({ ...voteForm, vote: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOR">✅ For</SelectItem>
                  <SelectItem value="AGAINST">❌ Against</SelectItem>
                  <SelectItem value="ABSTAIN">⚪ Abstain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
                value={voteForm.comment}
                onChange={e => setVoteForm({ ...voteForm, comment: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedSession && handleVote(selectedSession.id)}
            >
              Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
