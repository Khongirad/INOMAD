'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { api } from '@/lib/api';

interface UserDetail {
  id: string;
  seatId: string;
  role: string;
  verificationStatus: string;
  isSuperVerified: boolean;
  superVerifiedBy: string | null;
  isFrozen: boolean;
  frozenAt: string | null;
  frozenBy: string | null;
  walletStatus: string;
  walletAddress: string | null;
  ethnicity: string[];
  clan: string | null;
  birthPlace: any;
  currentAddress: any;
  createdAt: string;
  updatedAt: string;
  mpcWallet: any;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const userId = params?.id as string;

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}`) as any;
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!confirm('Verify this user?')) return;
    
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${userId}/verify`);
      await loadUser();
    } catch (error) {
      console.error('Failed to verify user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Reject this user?')) return;
    
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${userId}/reject`);
      await loadUser();
    } catch (error) {
      console.error('Failed to reject user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading user details...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">User not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-primary mb-2">
            User Details
          </h1>
          <p className="text-zinc-400">{user.seatId}</p>
        </div>
        <button
          onClick={() => router.push('/admin/users')}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
        >
          ← Back to Users
        </button>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg mb-6 ${
        user.verificationStatus === 'VERIFIED' ? 'bg-green-900/20 border border-green-700/30' :
        user.verificationStatus === 'PENDING' ? 'bg-yellow-900/20 border border-yellow-700/30' :
        user.verificationStatus === 'REJECTED' ? 'bg-red-900/20 border border-red-700/30' :
        'bg-zinc-800 border border-zinc-700'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-400">Verification Status</div>
            <div className="text-2xl font-bold mt-1">
              {user.verificationStatus}
            </div>
            {user.isSuperVerified && (
              <div className="text-sm text-green-400 mt-1">
                ✓ Super Verified
              </div>
            )}
            {user.isFrozen && (
              <div className="text-sm text-blue-400 mt-1">
                ❄️ Account Frozen
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {user.verificationStatus !== 'VERIFIED' && (
            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Verify User'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Reject User'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity Information */}
        <InfoCard title="Identity Information">
          <InfoRow label="Seat ID" value={user.seatId} />
          <InfoRow label="User ID" value={user.id} />
          <InfoRow label="Role" value={user.role} badge />
          <InfoRow label="Ethnicity" value={user.ethnicity.join(', ')} />
          <InfoRow label="Clan" value={user.clan || 'None'} />
        </InfoCard>

        {/* Wallet Information */}
        <InfoCard title="Wallet Information">
          <InfoRow label="Status" value={user.walletStatus} />
          <InfoRow 
            label="Address" 
            value={user.walletAddress ? `${user.walletAddress.slice(0, 10)}...${user.walletAddress.slice(-8)}` : 'Not created'} 
          />
          <InfoRow 
            label="MPC Wallet" 
            value={user.mpcWallet ? 'Created' : 'Not created'} 
          />
        </InfoCard>

        {/* Birth Place */}
        <InfoCard title="Birth Place">
          {user.birthPlace ? (
            <>
              <InfoRow label="Region" value={user.birthPlace.region || 'N/A'} />
              <InfoRow label="City" value={user.birthPlace.city || 'N/A'} />
            </>
          ) : (
            <div className="text-zinc-500">No birth place data</div>
          )}
        </InfoCard>

        {/* Current Address */}
        <InfoCard title="Current Address">
          {user.currentAddress ? (
            <>
              <InfoRow label="Region" value={user.currentAddress.region || 'N/A'} />
              <InfoRow label="City" value={user.currentAddress.city || 'N/A'} />
            </>
          ) : (
            <div className="text-zinc-500">No address data</div>
          )}
        </InfoCard>

        {/* Verification Details */}
        <InfoCard title="Verification Details">
          <InfoRow label="Status" value={user.verificationStatus} />
          <InfoRow label="Super Verified" value={user.isSuperVerified ? 'Yes' : 'No'} />
          {user.superVerifiedBy && (
            <InfoRow label="Verified By" value={user.superVerifiedBy} />
          )}
        </InfoCard>

        {/* Account Status */}
        <InfoCard title="Account Status">
          <InfoRow label="Frozen" value={user.isFrozen ? 'Yes' : 'No'} />
          {user.isFrozen && user.frozenAt && (
            <>
              <InfoRow 
                label="Frozen At" 
                value={new Date(user.frozenAt).toLocaleString()} 
              />
              {user.frozenBy && (
                <InfoRow label="Frozen By" value={user.frozenBy} />
              )}
            </>
          )}
        </InfoCard>

        {/* Timestamps */}
        <InfoCard title="Timestamps" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow 
              label="Created" 
              value={new Date(user.createdAt).toLocaleString()} 
            />
            <InfoRow 
              label="Updated" 
              value={new Date(user.updatedAt).toLocaleString()} 
            />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

function InfoCard({ 
  title, 
  children,
  className = ''
}: { 
  title: string; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gold-primary mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value,
  badge = false
}: { 
  label: string; 
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-400 text-sm">{label}</span>
      {badge ? (
        <span className="px-3 py-1 bg-purple-600 text-white text-sm rounded-full">
          {value}
        </span>
      ) : (
        <span className="text-zinc-100 font-medium">{value}</span>
      )}
    </div>
  );
}
