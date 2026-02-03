'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { api } from '@/lib/api';

interface User {
  id: string;
  seatId: string;
  role: string;
  verificationStatus: string;
  isFrozen: boolean;
  walletStatus: string;
  createdAt: string;
  ethnicity: string[];
  clan: string;
}

export default function UsersListPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'CREATOR') {
      loadUsers();
    }
  }, [user, statusFilter, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'text-green-400';
      case 'PENDING':
        return 'text-yellow-400';
      case 'REJECTED':
        return 'text-red-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CREATOR':
        return 'bg-gold-primary text-zinc-900';
      case 'ADMIN':
        return 'bg-purple-600 text-white';
      case 'LEADER':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-zinc-700 text-zinc-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold-primary mb-2">
            User Management
          </h1>
          <p className="text-zinc-400">Total: {total} users</p>
        </div>
        <button
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100"
        >
          <option value="">All Roles</option>
          <option value="CITIZEN">Citizen</option>
          <option value="LEADER">Leader</option>
          <option value="ADMIN">Admin</option>
          <option value="CREATOR">Creator</option>
        </select>

        <button
          onClick={() => {
            setStatusFilter('');
            setRoleFilter('');
          }}
          className="px-4 py-2 text-gold-primary hover:text-gold-secondary transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                Seat ID
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                Role
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                Wallet
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                Registered
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-100">{u.seatId}</div>
                  <div className="text-xs text-zinc-500">
                    {u.ethnicity.join(', ')}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(
                      u.role
                    )}`}
                  >
                    {u.role}
                  </span>
                  {u.isFrozen && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-200">
                      FROZEN
                    </span>
                  )}
                </td>
                <td className={`px-4 py-3 ${getStatusColor(u.verificationStatus)}`}>
                  {u.verificationStatus}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">
                  {u.walletStatus}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => router.push(`/admin/users/${u.id}`)}
                    className="px-3 py-1 bg-gold-primary/20 hover:bg-gold-primary/30 text-gold-primary rounded text-sm transition-colors"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}
