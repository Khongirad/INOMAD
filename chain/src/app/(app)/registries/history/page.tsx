'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scroll, History, FileText, Gavel, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

// Types for History Events
interface KhuralEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'SESSION_START' | 'DECREE_SIGNED' | 'APPOINTMENT' | 'AMENDMENT' | 'EMERGENCY';
  isVerified: boolean;
  versions?: KhuralEventVersion[]; // For Council View
}

interface KhuralEventVersion {
  id: string;
  title: string;
  description: string;
  proposedBy: string; // "Alex (Architect)"
  votes: number; // Current approvals
  requiredVotes: number; // e.g. 6
  myVote?: 'APPROVE' | 'REJECT' | null;
}

export default function HistoryPage() {
  const [events, setEvents] = useState<KhuralEvent[]>([]);
  const [pendingVersions, setPendingVersions] = useState<KhuralEventVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [isCouncilMember, setIsCouncilMember] = useState(true); // Mock: Current user is a Scientist

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await api.get('audit/history');
        if (data && Array.isArray(data)) {
          setEvents(data);
        } else { throw new Error("No data"); }
      } catch (err) {
        console.warn("Using mock history data:", err);
        // Fallback Mock Data
        setEvents([
          {
            id: '1', date: new Date().toISOString(), title: 'Khural Session #42 Established', 
            description: 'The regular session of the State Khural has commenced.', type: 'SESSION_START', isVerified: true
          },
          {
            id: '2', date: new Date(Date.now() - 86400000).toISOString(), title: 'Decree on Digital Heritage', 
            description: 'Ratified the Digital Heritage Act.', type: 'DECREE_SIGNED', isVerified: true
          },
        ]);
        
        // Mock Pending Versions (Drafts)
        setPendingVersions([
          {
            id: 'v1',
            title: 'Amendment to Decree #2',
            description: 'Clarifying that digital artifacts include 3D models of yurts.',
            proposedBy: 'Batu (Historian Lvl 8)',
            votes: 4,
            requiredVotes: 6,
            myVote: null
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleVote = (versionId: string, vote: boolean) => {
    // Optimistic Update
    setPendingVersions(prev => prev.map(v => {
      if (v.id === versionId) {
        return {
          ...v,
          votes: vote ? v.votes + 1 : v.votes,
          myVote: vote ? 'APPROVE' : 'REJECT'
        };
      }
      return v;
    }));
    // In real app: api.post('/council/vote', { versionId, vote })
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Scroll className="w-8 h-8 text-amber-500" />
            State Archives
          </h1>
          <p className="text-zinc-400 mt-1">Official immutable history & Council Validated Events.</p>
        </div>
        
        {isCouncilMember && (
          <div className="flex items-center gap-2 bg-amber-950/30 px-3 py-1 rounded border border-amber-500/20">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-200 uppercase tracking-widest font-bold">Council Member</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="timeline" onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="timeline">Official Timeline</TabsTrigger>
          <TabsTrigger value="council" className="relative">
            Council Review
            {pendingVersions.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <div className="relative border-l-2 border-zinc-800 ml-4 space-y-8 pl-8 py-4">
            {events.map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-zinc-950 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <Card className="p-6 bg-zinc-900/50 backdrop-blur border-zinc-800/50 hover:border-amber-500/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-amber-500 uppercase tracking-wider bg-amber-950/30 px-2 py-0.5 rounded">
                          {event.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        {event.isVerified && (
                          <span className="flex items-center gap-1 text-[10px] text-green-500 bg-green-950/30 px-2 py-0.5 rounded border border-green-900">
                            <CheckCircle className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-zinc-100 mb-2">{event.title}</h3>
                      <p className="text-zinc-400 leading-relaxed max-w-2xl">{event.description}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="council" className="mt-6">
          <div className="grid gap-4">
             <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg mb-4">
               <h3 className="text-lg font-bold text-white mb-2">Pending Validation Strategy</h3>
               <p className="text-sm text-zinc-400">
                 History is subjective until verified. As a Council Member (Top 10 Scientist), your vote determines the "Official Truth".
                 Requires <span className="text-amber-500 font-bold">6/10</span> consensus.
               </p>
             </div>

             {pendingVersions.map((version) => (
                <Card key={version.id} className="p-6 border-amber-500/20 bg-amber-950/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-400">PROPOSED EDIT</span>
                        <span className="text-xs text-zinc-500">by {version.proposedBy}</span>
                      </div>
                      <h4 className="text-xl font-bold text-white">{version.title}</h4>
                      <p className="text-zinc-300 mt-2 mb-4">{version.description}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span>Consensus:</span>
                          <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all" 
                              style={{ width: `${(version.votes / version.requiredVotes) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-white">{version.votes}/{version.requiredVotes}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {version.myVote === 'APPROVE' ? (
                        <Button disabled className="bg-green-600/20 text-green-500 border border-green-500/50">
                          <CheckCircle className="w-4 h-4 mr-2" /> Voted Yes
                        </Button>
                      ) : version.myVote === 'REJECT' ? (
                        <Button disabled className="bg-red-600/20 text-red-500 border border-red-500/50">
                          <XCircle className="w-4 h-4 mr-2" /> Voted No
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleVote(version.id, true)}
                            variant="outline" 
                            className="border-green-900 hover:bg-green-950 text-green-500"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                          <Button 
                            onClick={() => handleVote(version.id, false)}
                            variant="outline" 
                            className="border-red-900 hover:bg-red-950 text-red-500"
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
             ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
