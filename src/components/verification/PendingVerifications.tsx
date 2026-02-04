'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { getPendingUsers, verifyUser } from '@/lib/api';
import { toast } from 'sonner';

interface PendingUser {
  id: string;
  seatId: string;
  username: string;
  createdAt: string;
  constitutionAcceptedAt: string;
}

interface VerificationResult {
  verification: {
    id: string;
    verifiedUserId: string;
    verifierId: string;
    verificationMethod: string;
    createdAt: string;
  };
  chainLevel: number;
  remainingQuota: number;
  timelineEventId: string;
}

export function PendingVerifications() {
  const { token } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const data = await getPendingUsers();
      setPendingUsers(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      toast.error(`❌ Failed to fetch pending users: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId: string, notes?: string) => {
    try {
      setVerifying(userId);
      setError(null);

      const result = await verifyUser(userId, notes, 'Web Dashboard');

      // Remove verified user from pending list
      setPendingUsers(prev => prev.filter(u => u.id !== userId));

      // Show success message
      toast.success(
        `✅ User verified! Chain level: ${result.chainLevel}. Remaining quota: ${result.remainingQuota === -1 ? '∞' : result.remainingQuota}`
      );

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setVerifying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchPendingUsers}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No users pending verification</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Pending Verifications ({pendingUsers.length})
        </h3>
        <button
          onClick={fetchPendingUsers}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {pendingUsers.map((user) => (
          <div
            key={user.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{user.username}</h4>
                  <span className="text-xs text-gray-500">#{user.seatId}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <p>Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                  <p>Constitution accepted: {new Date(user.constitutionAcceptedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <button
                onClick={() => handleVerify(user.id)}
                disabled={verifying !== null}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  verifying === user.id
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {verifying === user.id ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Verifying...
                  </span>
                ) : (
                  'Verify User'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
