'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { getMyVerifierStats } from '@/lib/api';
import { toast } from 'sonner';

interface VerificationStats {
  verificationCount: number;
  maxVerifications: number;
  remainingQuota: number;
  isUnlimited: boolean;
  verificationsGiven: Array<{
    id: string;
    verifiedUserId: string;
    createdAt: string;
    verifiedUser: {
      id: string;
      username: string;
      verifiedAt: string;
    };
  }>;
}

export function VerificationStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getMyVerifierStats();
      setStats(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch stats';
      console.error('Failed to fetch verification stats:', err);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const quotaPercentage = stats.isUnlimited 
    ? 100 
    : (stats.verificationCount / stats.maxVerifications) * 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Your Verification Stats</h3>

      {/* Quota Display */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Verification Quota</span>
          <span className="text-sm font-bold text-gray-900">
            {stats.isUnlimited ? (
              <span className="text-blue-600">∞ Unlimited</span>
            ) : (
              `${stats.verificationCount} / ${stats.maxVerifications}`
            )}
          </span>
        </div>

        {!stats.isUnlimited && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                quotaPercentage >= 80 ? 'bg-red-600' : quotaPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-600'
              }`}
              style={{ width: `${quotaPercentage}%` }}
            ></div>
          </div>
        )}

        <p className="mt-2 text-xs text-gray-500">
          {stats.isUnlimited ? (
            'You have unlimited verifications (Admin/Creator)'
          ) : (
            `${stats.remainingQuota} verification${stats.remainingQuota !== 1 ? 's' : ''} remaining`
          )}
        </p>
      </div>

      {/* Recent Verifications */}
      {stats.verificationsGiven.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Recent Verifications ({stats.verificationsGiven.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stats.verificationsGiven.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {v.verifiedUser.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-green-600 font-medium">✓ Verified</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.verificationsGiven.length === 0 && (
        <div className="pt-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">No verifications given yet</p>
        </div>
      )}
    </div>
  );
}
