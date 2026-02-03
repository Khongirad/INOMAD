'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { api } from '@/lib/api';

interface Admin {
  id: string;
  seatId: string;
  role: string;
  isFrozen: boolean;
  frozenAt: string | null;
  frozenBy: string | null;
  walletAddress: string | null;
  createdAt: string;
}

export default function AdminManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdminSeatId, setNewAdminSeatId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Check Creator privileges
  useEffect(() => {
    if (user?.role !== 'CREATOR') {
      router.push('/admin');
    } else {
      loadAdmins();
    }
  }, [user, router]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/admins') as any;
      setAdmins(response.data);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminSeatId.trim()) return;

    try {
      setActionLoading(true);
      await api.post('/creator/admins', { seatId: newAdminSeatId });
      setNewAdminSeatId('');
      setShowCreateForm(false);
      await loadAdmins();
    } catch (error: any) {
      console.error('Failed to create admin:', error);
      alert(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreezeAdmin = async (adminId: string, freeze: boolean) => {
    const action = freeze ? 'freeze' : 'unfreeze';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this admin?`)) return;

    try {
      await api.post(`/creator/admins/${adminId}/${action}`);
      await loadAdmins();
    } catch (error) {
      console.error(`Failed to ${action} admin:`, error);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm('Remove admin privileges from this user? They will become a CITIZEN.')) return;

    try {
      await api.delete(`/creator/admins/${adminId}`);
      await loadAdmins();
    } catch (error) {
      console.error('Failed to remove admin:', error);
    }
  };

  const adminCount = admins.filter(a => a.role === 'ADMIN').length;
  const canCreateMore = adminCount < 9;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading admin management...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gold-primary mb-2">
          👑 Admin Management
        </h1>
        <p className="text-zinc-400">
          Creator Supreme Control • {adminCount} / 9 Admins
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Admins"
          value={adminCount}
          icon="👥"
          max={9}
        />
        <StatCard
          title="Active"
          value={admins.filter(a => a.role === 'ADMIN' && !a.isFrozen).length}
          icon="✅"
        />
        <StatCard
          title="Frozen"
          value={admins.filter(a => a.isFrozen).length}
          icon="❄️"
        />
        <StatCard
          title="Available Slots"
          value={9 - adminCount}
          icon="🎯"
        />
      </div>

      {/* Create Admin Button */}
      {canCreateMore && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="mb-6 px-6 py-3 bg-gold-primary hover:bg-gold-secondary text-zinc-900 font-semibold rounded-lg transition-colors"
        >
          + Create New Admin
        </button>
      )}

      {!canCreateMore && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">
          ⚠️ Maximum of 9 admins reached. Remove an admin to add a new one.
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateAdmin} className="mb-6 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h3 className="text-lg font-semibold text-gold-primary mb-4">
            Create New Admin
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={newAdminSeatId}
              onChange={(e) => setNewAdminSeatId(e.target.value)}
              placeholder="Enter user Seat ID to promote to Admin"
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100"
              required
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Creating...' : 'Create Admin'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewAdminSeatId('');
              }}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Admins List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-zinc-800 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-100">Admin Team</h2>
        </div>

        <div className="divide-y divide-zinc-800">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="p-6 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      admin.role === 'CREATOR' 
                        ? 'bg-gold-primary text-zinc-900 font-bold'
                        : 'bg-purple-600 text-white'
                    }`}>
                      {admin.role}
                    </span>
                    {admin.isFrozen && (
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-900 text-blue-200">
                        ❄️ FROZEN
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-zinc-100 text-lg">
                    {admin.seatId}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">
                    Created: {new Date(admin.createdAt).toLocaleDateString()}
                  </div>
                  {admin.walletAddress && (
                    <div className="text-xs text-zinc-500 mt-1">
                      Wallet: {admin.walletAddress.slice(0, 10)}...{admin.walletAddress.slice(-8)}
                    </div>
                  )}
                </div>

                {/* Actions (only for ADMINs, not Creator) */}
                {admin.role === 'ADMIN' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFreezeAdmin(admin.id, !admin.isFrozen)}
                      className={`px-4 py-2 rounded-md text-sm transition-colors ${
                        admin.isFrozen
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {admin.isFrozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                    >
                      Remove Admin
                    </button>
                  </div>
                )}

                {admin.role === 'CREATOR' && (
                  <div className="text-gold-primary text-sm font-semibold">
                    Supreme Authority
                  </div>
                )}
              </div>

              {admin.isFrozen && admin.frozenAt && (
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-sm">
                  <div className="text-blue-400">
                    Frozen on {new Date(admin.frozenAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ))}

          {admins.length === 0 && (
            <div className="p-12 text-center text-zinc-500">
              No admins found. Create your first admin to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  max,
}: {
  title: string;
  value: number;
  icon: string;
  max?: number;
}) {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-zinc-100">
          {value}{max && `/${max}`}
        </span>
      </div>
      <div className="text-sm text-zinc-400">{title}</div>
    </div>
  );
}
