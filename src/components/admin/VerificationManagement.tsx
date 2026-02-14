'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, UserCheck, UserX, Info, TrendingUp } from 'lucide-react';

interface VerificationChainNode {
  userId: string;
  seatId: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  depth: number;
  canVerifyCount: number;
  hasVerifiedCount: number;
}

interface VerificationManagementProps {
  userId: string;
  seatId: string;
  verificationStatus: string;
}

export function VerificationManagement({
  userId,
  seatId,
  verificationStatus,
}: VerificationManagementProps) {
  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState<VerificationChainNode[]>([]);
  const [stats, setStats] = useState<{
    totalVerified: number;
    quota: number;
    used: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const chainRes = await fetch(`/api/verification/chain/${userId}`);
      if (!chainRes.ok) throw new Error('Failed to fetch verification chain');
      const chainData = await chainRes.json();
      setChain(chainData);

      const statsRes = await fetch(`/api/verification/stats?userId=${userId}`);
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeVerification = async () => {
    if (!confirm(`Are you sure you want to revoke verification for ${seatId}?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/verification/revoke/${userId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to revoke verification');

      alert('Verification revoked successfully');
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-md hover:bg-accent transition-colors text-primary"
        title="View verification chain and management options"
      >
        <Network className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Verification Management - {seatId}
            </DialogTitle>
            <DialogDescription>
              View verification chain and manage verification status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {loading && (
              <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                <div className="bg-primary h-1 animate-pulse w-full" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Current Status */}
            <div>
              <h4 className="font-semibold mb-2">Current Status</h4>
              <Badge
                variant={verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}
                className={`gap-1 ${
                  verificationStatus === 'VERIFIED'
                    ? 'bg-green-600 hover:bg-green-700'
                    : verificationStatus === 'PENDING'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : ''
                }`}
              >
                {verificationStatus === 'VERIFIED' && <UserCheck className="h-3.5 w-3.5" />}
                {verificationStatus}
              </Badge>
            </div>

            {/* Verification Chain */}
            {chain.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Verification Chain</h4>
                <div className="pl-2 space-y-2">
                  {chain.map((node, index) => (
                    <div
                      key={node.userId}
                      className="flex items-center gap-3"
                      style={{ paddingLeft: `${node.depth * 24}px` }}
                    >
                      <span className="text-sm text-muted-foreground">L{node.depth}</span>
                      <Badge variant={index === 0 ? 'default' : 'outline'} className="text-xs">
                        {node.seatId}
                      </Badge>
                      {node.verifiedBy && (
                        <span className="text-xs text-muted-foreground">
                          verified by {node.verifiedBy}
                          {node.verifiedAt && (
                            <> on {new Date(node.verifiedAt).toLocaleDateString()}</>
                          )}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {node.hasVerifiedCount}/{node.canVerifyCount} verified
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            {stats && (
              <div>
                <h4 className="font-semibold mb-2">Verifier Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Verified</p>
                    <p className="text-2xl font-bold">{stats.totalVerified}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quota Remaining</p>
                    <p className="text-2xl font-bold">
                      {stats.quota - stats.used}/{stats.quota}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Usage</p>
                    <p className="text-2xl font-bold">
                      {Math.round((stats.used / stats.quota) * 100)}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      stats.used >= stats.quota ? 'bg-red-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min((stats.used / stats.quota) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Warning Info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Revoking verification will remove the user&apos;s VERIFIED status and affect all
                users they have verified.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {verificationStatus === 'VERIFIED' && (
              <Button
                variant="destructive"
                onClick={handleRevokeVerification}
                disabled={loading}
                className="gap-2"
              >
                <UserX className="h-4 w-4" />
                Revoke Verification
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
