'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { api } from '@/lib/api';

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  verifiedUsers: number;
  rejectedUsers: number;
  totalAdmins: number;
}

interface PendingUser {
  id: string;
  seatId: string;
  verificationStatus: string;
  createdAt: string;
  ethnicity: string[];
  clan: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Check admin privileges
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (user?.role !== 'ADMIN' && user?.role !== 'CREATOR') {
        router.push('/dashboard');
      }
    }
  }, [user, isAuthenticated, loading, router]);

  // Load dashboard data
  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'CREATOR') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      const [statsData, pendingData] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users/pending'),
      ]);
      setStats(statsData.data);
      setPendingUsers(pendingData.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/verify`);
      loadDashboardData(); // Refresh
    } catch (error) {
      console.error('Failed to verify user:', error);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/reject`);
      loadDashboardData(); // Refresh
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gold-primary mb-2">
          Admin Dashboard
        </h1>
        <p className="text-zinc-400">
          {user?.role === 'CREATOR' ? 'Supreme Creator' : 'Admin'} Panel
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon="👥"
          />
          <StatCard
            title="Pending"
            value={stats.pendingUsers}
            icon="⏳"
            highlight
          />
          <StatCard
            title="Verified"
            value={stats.verifiedUsers}
            icon="✅"
          />
          <StatCard
            title="Rejected"
            value={stats.rejectedUsers}
            icon="❌"
          />
          <StatCard
            title="Admins"
            value={stats.totalAdmins}
            icon="👑"
          />
        </div>
      )}

      {/* Pending Users */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gold-primary">
            Pending Verifications
          </h2>
          <button
            onClick={() => router.push('/admin/users')}
            className="text-sm text-gold-primary hover:text-gold-secondary transition-colors"
          >
            View All Users →
          </button>
        </div>

        {pendingUsers.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            No pending verifications
          </p>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-zinc-100">
                    {user.seatId}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {user.ethnicity.join(', ')} • {user.clan || 'No clan'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyUser(user.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => handleRejectUser(user.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creator-only section */}
      {user?.role === 'CREATOR' && (
        <div className="mt-8 p-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-gold-primary/30 rounded-lg">
          <h3 className="text-lg font-semibold text-gold-primary mb-2">
            Creator Controls
          </h3>
          <p className="text-zinc-400 text-sm mb-4">
            Manage your admin team (up to 9 generals)
          </p>
          <button
            onClick={() => router.push('/creator/admins')}
            className="px-6 py-2 bg-gold-primary hover:bg-gold-secondary text-zinc-900 font-semibold rounded-md transition-colors"
          >
            Manage Admins
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlight
          ? 'bg-gold-primary/10 border-gold-primary/30'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span
          className={`text-3xl font-bold ${
            highlight ? 'text-gold-primary' : 'text-zinc-100'
          }`}
        >
          {value}
        </span>
      </div>
      <div className="text-sm text-zinc-400">{title}</div>
    </div>
  );
}
