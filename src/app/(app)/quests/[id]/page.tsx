'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock, Coins, Trophy, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { questApi, Quest } from '@/lib/api/quests';
import QuestTracker from '@/components/quests/QuestTracker';
import ReputationDialog from '@/components/reputation/ReputationDialog';

export default function QuestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;

  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReputation, setShowReputation] = useState(false);
  const [reputationUserId, setReputationUserId] = useState<string>('');

  useEffect(() => {
    fetchQuest();
  }, [questId]);

  const fetchQuest = async () => {
    try {
      const data = await questApi.getById(questId);
      setQuest(data);
    } catch (error) {
      console.error('Failed to fetch quest:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await questApi.accept(questId);
      await fetchQuest();
    } catch (error) {
      console.error('Failed to accept quest:', error);
    }
  };

  const handleToggleObjective = async (index: number) => {
    if (!quest) return;
    const updated = [...quest.objectives];
    updated[index].completed = !updated[index].completed;
    
    try {
      await questApi.updateProgress(questId, updated);
      setQuest({ ...quest, objectives: updated });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      await questApi.submit(questId, []);
      await fetchQuest();
    } catch (error) {
      console.error('Failed to submit quest:', error);
    }
  };

  const handleApprove = async () => {
    const rating = 5; // TODO: Get from modal
    try {
      await questApi.approve(questId, rating);
      await fetchQuest();
    } catch (error) {
      console.error('Failed to approve quest:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-400/10 text-green-400';
      case 'ACCEPTED': return 'bg-blue-400/10 text-blue-400';
      case 'IN_PROGRESS': return 'bg-yellow-400/10 text-yellow-400';
      case 'SUBMITTED': return 'bg-purple-400/10 text-purple-400';
      case 'COMPLETED': return 'bg-gold-primary/10 text-gold-primary';
      default: return 'bg-zinc-400/10 text-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto" />
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="container max-w-4xl py-12 text-center">
        <AlertCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Task не найдено</h2>
        <Link href="/quests" className="text-purple-400 hover:underline">
          ← Return to quest board
        </Link>
      </div>
    );
  }

  const isGiver = true; // TODO: Check if current user is giver
  const isTaker = true; // TODO: Check if current user is taker
  const canAccept = quest.status === 'OPEN' && !isTaker;
  const canUpdate = quest.status === 'ACCEPTED' && isTaker;
  const canSubmit = quest.progress === 100 && quest.status !== 'SUBMITTED' && isTaker;
  const canApprove = quest.status === 'SUBMITTED' && isGiver;

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in">
      {/* Back Button */}
      <Link href="/quests" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        Back к доске заданий
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{quest.title}</h1>
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => {
                setReputationUserId(quest.giver.id);
                setShowReputation(true);
              }}
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              от <span className="text-purple-400">{quest.giver.username}</span>
            </button>
            <span className="text-sm text-zinc-500">
              {new Date(quest.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(quest.status)}`}>
          {quest.status}
        </span>
      </div>

      {/* Description */}
      <div className="prose prose-invert max-w-none">
        <p className="text-zinc-300 leading-relaxed">{quest.description}</p>
      </div>

      {/* Rewards */}
      <div className="grid grid-cols-3 gap-4">
        {quest.rewardAltan && (
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 text-gold-primary mb-1">
              <Coins className="w-5 h-5" />
              <span className="text-sm font-medium">Награда</span>
            </div>
            <div className="text-2xl font-bold text-white">{quest.rewardAltan} ALTAN</div>
          </div>
        )}
        {quest.reputationGain && (
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-medium">Reputation</span>
            </div>
            <div className="text-2xl font-bold text-white">+{quest.reputationGain}</div>
          </div>
        )}
        {quest.deadline && (
          <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Deadline</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {new Date(quest.deadline).toLocaleDateString('ru-RU')}
            </div>
          </div>
        )}
      </div>

      {/* Objectives */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Objectives</h2>
        <QuestTracker
          objectives={quest.objectives}
          progress={quest.progress}
          onToggleObjective={canUpdate ? handleToggleObjective : undefined}
          editable={canUpdate}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {canAccept && (
          <button
            onClick={handleAccept}
            className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-medium"
          >
            Accept task
          </button>
        )}
        {canSubmit && (
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gold-primary text-black rounded-lg hover:bg-gold-primary/90 transition font-medium"
          >
            Send на проверку
          </button>
        )}
        {canApprove && (
          <button
            onClick={handleApprove}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
          >
            ✓ Confirm completion
          </button>
        )}
      </div>

      {/* Reputation Dialog */}
      <ReputationDialog
        userId={reputationUserId}
        isOpen={showReputation}
        onClose={() => setShowReputation(false)}
      />
    </div>
  );
}
