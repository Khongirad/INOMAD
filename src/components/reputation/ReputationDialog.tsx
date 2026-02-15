'use client';

import { useEffect, useState } from 'react';
import { X, Star, TrendingUp, Award, AlertTriangle } from 'lucide-react';

interface ReputationDialogProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  showDetails?: boolean; // Only true when signing cooperation agreement
}

interface ReputationData {
  successRate: number;
  averageRating: number;
  totalDeals: number;
  badges: Array<{ id: string; name: string; earnedAt: string }>;
  transactions?: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
    status: string;
  }>;
}

export default function ReputationDialog({
  userId,
  isOpen,
  onClose,
  showDetails = false,
}: ReputationDialogProps) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchReputation();
    }
  }, [isOpen, userId]);

  const fetchReputation = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/reputation/${userId}`);
      // const data = await response.json();
      setData({
        successRate: 92,
        averageRating: 4.6,
        totalDeals: 47,
        badges: [
          { id: 'reliable', name: 'Highly Reliable (95%+)', earnedAt: '2026-01-15' },
          { id: 'quest_veteran', name: '50 Quests Completed', earnedAt: '2026-01-20' },
        ],
        transactions: showDetails ? [
          { id: '1', type: 'quest', title: 'UI Design Task', date: '2026-02-01', status: 'COMPLETED' },
          { id: '2', type: 'document', title: 'Service Contract', date: '2026-01-28', status: 'ACTIVE' },
        ] : undefined,
      });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch reputation:', error);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-gold-primary" />
            Reputation user
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-primary mx-auto"></div>
            <p className="text-zinc-400 mt-4">Loading dataх...</p>
          </div>
        ) : data ? (
          <div className="p-6 space-y-6">
            {/* Warning */}
            {data.successRate < 80 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-500">Low показатель successfullyсти</h3>
                  <p className="text-sm text-yellow-400/80 mt-1">
                    Percent успешных сcaseк ниже нормы. Рекомендуется осторожность.
                  </p>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Success Rate */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="text-2xl font-bold text-white">
                  {data.successRate}%
                </div>
                <div className="text-xs text-zinc-400 mt-1">Успешных сcaseк</div>
                <div className={`text-xs mt-2 ${
                  data.successRate >= 95 ? 'text-green-400' :
                  data.successRate >= 80 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {data.successRate >= 95 ? '✓ Отлично' :
                   data.successRate >= 80 ? '~ Нормально' :
                   '! Требует внимания'}
                </div>
              </div>

              {/* Rating */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-1">
                  <div className="text-2xl font-bold text-white">
                    {data.averageRating.toFixed(1)}
                  </div>
                  <Star className="w-5 h-5 text-gold-primary fill-gold-primary" />
                </div>
                <div className="text-xs text-zinc-400 mt-1">Medium rating</div>
                <div className="flex gap-0.5 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.floor(data.averageRating)
                          ? 'text-gold-primary fill-gold-primary'
                          : 'text-zinc-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Total Deals */}
              <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
                <div className="text-2xl font-bold text-white">
                  {data.totalDeals}
                </div>
                <div className="text-xs text-zinc-400 mt-1">Total сcaseк</div>
                <div className="text-xs text-blue-400 mt-2">
                  {data.totalDeals > 50 ? 'Experienceный' : 'Стандартно'}
                </div>
              </div>
            </div>

            {/* Badges */}
            {data.badges.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold-primary" />
                  Achievements
                </h3>
                <div className="space-y-2">
                  {data.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <div className="w-10 h-10 rounded-full bg-gold-primary/10 flex items-center justify-center">
                        <Award className="w-5 h-5 text-gold-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{badge.name}</div>
                        <div className="text-xs text-zinc-400">
                          Genderучено: {new Date(badge.earnedAt).toLocaleDateString('en-US')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions (only if authorized) */}
            {showDetails && data.transactions && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  History транзакций
                </h3>
                <div className="space-y-2">
                  {data.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <div>
                        <div className="text-sm text-white">{tx.title}</div>
                        <div className="text-xs text-zinc-400">
                          {tx.type} • {new Date(tx.date).toLocaleDateString('en-US')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.status === 'COMPLETED' ? 'bg-green-400/10 text-green-400' :
                        tx.status === 'ACTIVE' ? 'bg-blue-400/10 text-blue-400' :
                        'bg-zinc-600/10 text-zinc-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-3">
                  Detailed Information accessна only при подписании соглашений о cooperationsе
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-zinc-400">Failed to load data репутации</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
