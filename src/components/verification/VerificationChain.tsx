'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { getVerificationChain } from '@/lib/api';
import { toast } from 'sonner';

interface ChainNode {
  username: string;
  role: string;
  verifiedAt: string;
}

interface VerificationChainProps {
  userId: string;
  username?: string;
}

export function VerificationChain({ userId, username }: VerificationChainProps) {
  const { token } = useAuth();
  const [chain, setChain] = useState<ChainNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChain();
  }, [userId]);

  const fetchChain = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getVerificationChain(userId);
      setChain(data as any);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load chain';
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Verification Chain {username && `for ${username}`}
      </h3>

      {chain.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">User not verified yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span>Chain Length: {chain.length} hop{chain.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-gray-500">Oldest → Newest</span>
          </div>

          {/* Chain visualization */}
          <div className="relative">
            {chain.map((node, index) => (
              <div key={index} className="relative">
                {/* Node */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {chain.length - index}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{node.username}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        node.role === 'CREATOR' 
                          ? 'bg-purple-100 text-purple-800'
                          : node.role === 'ADMIN'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {node.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Verified on {new Date(node.verifiedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Arrow connector */}
                {index < chain.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-0.5 h-4 bg-blue-300"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Trust level indicator */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-semibold">✓ Verified Chain</span>
              <br />
              <span className="text-xs">
                This user's identity is verified through {chain.length} level{chain.length !== 1 ? 's' : ''} of trust,
                {chain[chain.length - 1]?.role === 'CREATOR' && ' directly from the Creator'}
                {chain[chain.length - 1]?.role === 'ADMIN' && ' originating from an Admin'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
