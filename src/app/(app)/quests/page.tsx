'use client';

import { useState, useEffect } from 'react';
import { Scroll, Clock, Coins, Trophy, Users, Filter } from 'lucide-react';
import Link from 'next/link';

interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: Array<{ description: string; completed: boolean }>;
  rewardAltan?: number;
  reputationGain?: number;
  deadline?: string;
  status: string;
  giver: { id: string; username: string };
  progress: number;
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filter, setFilter] = useState<'all' | 'my' | 'available'>('available');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch quests from API
    setLoading(false);
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-400 bg-green-400/10';
      case 'ACCEPTED': return 'text-blue-400 bg-blue-400/10';
      case 'IN_PROGRESS': return 'text-yellow-400 bg-yellow-400/10';
      case 'SUBMITTED': return 'text-purple-400 bg-purple-400/10';
      case 'COMPLETED': return 'text-gold-primary bg-gold-primary/10';
      default: return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  return (
    <div className="container max-w-7xl py-8 space-y-8 animate-in fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Scroll className="text-purple-400 w-8 h-8" />
            Quest Board
          </h1>
          <p className="text-zinc-400 mt-2">
            Post and complete quests in RPG style
          </p>
        </div>
        <Link
          href="/quests/create"
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
        >
          + Create Quest
        </Link>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('available')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'available'
              ? 'bg-purple-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Available
        </button>
        <button
          onClick={() => setFilter('my')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'my'
              ? 'bg-purple-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          My Quests
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          All
        </button>
      </div>

      {/* QUEST BOARD */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-zinc-400 mt-4">Loading quests...</p>
        </div>
      ) : quests.length === 0 ? (
        <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <Scroll className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Available Quests
          </h3>
          <p className="text-zinc-400">
            Create the first quest or check back later
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quests.map((quest) => (
            <Link
              key={quest.id}
              href={`/quests/${quest.id}`}
              className="group bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 hover:border-purple-500/50 hover:bg-zinc-800 transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">
                    {quest.title}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    от {quest.giver.username}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quest.status)}`}>
                  {quest.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-zinc-300 text-sm line-clamp-2 mb-4">
                {quest.description}
              </p>

              {/* Objectives Preview */}
              <div className="space-y-1 mb-4">
                {quest.objectives.slice(0, 3).map((obj, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className={`w-4 h-4 rounded border ${
                      obj.completed 
                        ? 'bg-green-500/20 border-green-500' 
                        : 'border-zinc-600'
                    }`}>
                      {obj.completed && (
                        <div className="text-green-400 text-center leading-none">✓</div>
                      )}
                    </div>
                    <span className={obj.completed ? 'line-through' : ''}>
                      {obj.description}
                    </span>
                  </div>
                ))}
                {quest.objectives.length > 3 && (
                  <p className="text-xs text-zinc-500 ml-6">
                    +{quest.objectives.length - 3} more...
                  </p>
                )}
              </div>

              {/* Rewards & Info */}
              <div className="flex items-center gap-4 pt-4 border-t border-zinc-700 text-sm">
                {quest.rewardAltan && (
                  <div className="flex items-center gap-1 text-gold-primary">
                    <Coins className="w-4 h-4" />
                    <span>{quest.rewardAltan} ALTAN</span>
                  </div>
                )}
                {quest.reputationGain && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <Trophy className="w-4 h-4" />
                    <span>+{quest.reputationGain} REP</span>
                  </div>
                )}
                {quest.deadline && (
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(quest.deadline).toLocaleDateString('en-US')}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {quest.progress > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Progress</span>
                    <span>{quest.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${quest.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
