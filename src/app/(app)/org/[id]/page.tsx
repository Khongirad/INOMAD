'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Award,
  Star,
  DollarSign,
  CheckCircle,
  Shield,
  FileText,
  Building2,
  GitBranch,
  Crown,
  UserPlus,
  UserMinus,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ========================
// Types
// ========================

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    seatId: string;
    username: string;
    role: string;
    verificationLevel?: string;
    reputationProfile?: { score: number };
  };
}

interface OrgPermissions {
  id: string;
  role: string;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canCreateTasks: boolean;
  canAssignTasks: boolean;
  canVote: boolean;
  canCreateProposal: boolean;
  canManageTreasury: boolean;
  canSignDocuments: boolean;
  canCallElection: boolean;
  canEditOrgInfo: boolean;
  canViewReports: boolean;
  canCreateReports: boolean;
  canManageRoles: boolean;
  canArchive: boolean;
}

interface OrgDashboardData {
  id: string;
  name: string;
  type: string;
  branch?: string;
  description?: string;
  level: number;
  leaderId: string;
  leader: { id: string; seatId: string; username: string; role: string };
  parent?: { id: string; name: string; type: string };
  children: Array<{ id: string; name: string; type: string; overallRating: number; members: { id: string }[] }>;
  members: OrgMember[];
  permissions: OrgPermissions[];
  ratings: Array<{
    id: string;
    category: string;
    score: number;
    comment?: string;
    createdAt: string;
    rater: { id: string; seatId: string; username: string };
  }>;
  achievements: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    awardedAt: string;
  }>;
  elections: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    candidates: Array<{ candidate: { id: string; seatId: string; username: string } }>;
  }>;
  trustScore: number;
  qualityScore: number;
  financialScore: number;
  overallRating: number;
  currentRank?: number;
  totalRevenue: number;
  contractsCompleted: number;
  contractsActive: number;
  maxMembers: number;
  roleDistribution: Record<string, number>;
  memberCount: number;
  childCount: number;
  isFull: boolean;
  createdAt: string;
}

// ========================
// Role Configuration
// ========================

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string; order: number }> = {
  LEADER: { label: 'Head', color: 'bg-yellow-500', icon: '👑', order: 0 },
  DEPUTY: { label: 'Deputy', color: 'bg-gray-400', icon: '🛡️', order: 1 },
  TREASURER: { label: 'Treasurer', color: 'bg-green-500', icon: '💰', order: 2 },
  SECRETARY: { label: 'Secretary', color: 'bg-blue-500', icon: '📋', order: 3 },
  OFFICER: { label: 'Official', color: 'bg-purple-500', icon: '⚔️', order: 4 },
  MEMBER: { label: 'Member', color: 'bg-gray-500', icon: '👤', order: 5 },
  APPRENTICE: { label: 'Apprentice', color: 'bg-orange-500', icon: '📚', order: 6 },
};

const PERMISSION_LABELS: Record<string, string> = {
  canInviteMembers: 'Invite members',
  canRemoveMembers: 'Exclude members',
  canCreateTasks: 'Create tasks',
  canAssignTasks: 'Assign tasks',
  canVote: 'Vote',
  canCreateProposal: 'Make proposals',
  canManageTreasury: 'Manage treasury',
  canSignDocuments: 'Sign documents',
  canCallElection: 'Call elections',
  canEditOrgInfo: 'Edit information',
  canViewReports: 'View reports',
  canCreateReports: 'Create reports',
  canManageRoles: 'Manage roles',
  canArchive: 'Archive',
};

// ========================
// Component
// ========================

export default function UnifiedOrgDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [data, setData] = useState<OrgDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/org/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch organization');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    if (orgId) fetchDashboard();
  }, [orgId, fetchDashboard]);

  const handleInvite = async () => {
    try {
      const res = await fetch(`/api/org/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: inviteUserId, role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add member');
      }
      setInviteOpen(false);
      setInviteUserId('');
      toast.success('Member added');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`/api/org/${orgId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed');
      }
      toast.success('Member removed');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/org/${orgId}/members/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed');
      }
      toast.success('Role updated');
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GUILD: '🛡️ Guild',
      COMMITTEE: '📋 Committee',
      SERVICE: '🏛️ State Service',
      ARBAN: '⚔️ Arban (10)',
      HUNDRED: '🏘️ Zuun (100)',
      THOUSAND: '🏙️ Myangan (1000)',
      REPUBLIC: '🏛️ Republic',
      CONFEDERATION: '🌍 Confederation',
    };
    return labels[type] || type;
  };

  const getBranchLabel = (branch?: string) => {
    const labels: Record<string, string> = {
      LEGISLATIVE: '📜 Legislative',
      EXECUTIVE: '🏢 Executive',
      JUSTICE: '⚖️ Judicial',
      BANKING: '🏦 Banking',
      CIVIL_SERVICE: '🏛️ Civil Service',
    };
    return branch ? labels[branch] || branch : null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading organization...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
          {error || 'Organization not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* ==================== HEADER ==================== */}
      <div className="rounded-xl p-6 mb-6 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{data.name}</h1>
              {data.currentRank && data.currentRank <= 100 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 font-bold gap-1">
                  <Award className="h-3.5 w-3.5" />
                  #{data.currentRank}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-white/15 text-white">{getTypeLabel(data.type)}</Badge>
              {getBranchLabel(data.branch) && (
                <Badge className="bg-white/15 text-white">{getBranchLabel(data.branch)!}</Badge>
              )}
              <Badge className={`text-white gap-1 ${data.isFull ? 'bg-red-500/30' : 'bg-green-500/30'}`}>
                <Users className="h-3 w-3" />
                {data.memberCount}/{data.maxMembers} members
              </Badge>
            </div>
            {data.description && (
              <p className="text-sm mt-2 opacity-80">{data.description}</p>
            )}
          </div>

          {/* Rating Circle */}
          <div className="text-center min-w-[100px]">
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto ${
              data.overallRating >= 8 ? 'border-green-500' : data.overallRating >= 6 ? 'border-orange-500' : 'border-red-500'
            }`}>
              <span className="text-2xl font-bold">{data.overallRating.toFixed(1)}</span>
            </div>
            <p className="text-xs opacity-70 mt-1">Overall Rating</p>
          </div>
        </div>

        {/* Sub-ratings */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Trust', score: data.trustScore, icon: '❤️' },
            { label: 'Quality', score: data.qualityScore, icon: '⭐' },
            { label: 'Finance', score: data.financialScore, icon: '💰' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span>{item.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-xs">{item.label}</span>
                  <span className={`text-xs font-bold ${getScoreColor(item.score)}`}>
                    {item.score.toFixed(1)}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full mt-0.5">
                  <div
                    className={`h-full rounded-full ${getScoreBarColor(item.score)}`}
                    style={{ width: `${item.score * 10}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== NAVIGATION TABS ==================== */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="team">👥 Team</TabsTrigger>
          <TabsTrigger value="permissions">🛡️ Authorities</TabsTrigger>
          <TabsTrigger value="achievements">🏆 Achievements</TabsTrigger>
          <TabsTrigger value="structure">🏗️ Structure</TabsTrigger>
        </TabsList>

        {/* ==================== TAB: OVERVIEW ==================== */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stats */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">📊 Statistics</h3>
                <div className="border-t border-border mb-3" />
                {[
                  { label: 'Contracts completed', value: data.contractsCompleted, icon: <CheckCircle className="h-4 w-4" /> },
                  { label: 'Active contracts', value: data.contractsActive, icon: <FileText className="h-4 w-4" /> },
                  { label: 'Total revenue', value: `${data.totalRevenue.toLocaleString()} ₮`, icon: <DollarSign className="h-4 w-4" /> },
                  { label: 'Members', value: `${data.memberCount}/${data.maxMembers}`, icon: <Users className="h-4 w-4" /> },
                  { label: 'Divisions', value: data.childCount, icon: <Building2 className="h-4 w-4" /> },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between items-center py-1.5">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      {stat.icon}
                      {stat.label}
                    </span>
                    <span className="font-bold text-sm">{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Leader & Roles */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">👑 Leadership</h3>
                <div className="border-t border-border mb-3" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold">
                    {data.leader.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-bold">{data.leader.username || data.leader.seatId}</p>
                    <Badge className="bg-yellow-500 text-black text-xs">Head</Badge>
                  </div>
                </div>

                <p className="text-sm font-semibold mt-3 mb-1">Role distribution:</p>
                {Object.entries(data.roleDistribution ?? {}).map(([role, count]) => (
                  <div key={role} className="flex justify-between py-0.5">
                    <span className="text-sm">
                      {ROLE_CONFIG[role]?.icon} {ROLE_CONFIG[role]?.label || role}
                    </span>
                    <Badge variant="outline" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Ratings */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">⭐ Recent ratings</h3>
                <div className="border-t border-border mb-3" />
                {data.ratings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not yet ratings</p>
                ) : (
                  data.ratings.slice(0, 5).map((r) => (
                    <div key={r.id} className="py-2 border-b border-border/50 last:border-0">
                      <div className="flex justify-between">
                        <span className="text-sm">{r.category}</span>
                        <Badge variant="outline" className={`text-xs ${getScoreColor(r.score)}`}>
                          {r.score.toFixed(1)}
                        </Badge>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-muted-foreground">"{r.comment}"</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        — @{r.rater.username} • {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Hierarchy path */}
            {data.parent && (
              <div className="col-span-full">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <GitBranch className="h-4 w-4" />
                    Parent Organization: <strong>{data.parent.name}</strong> ({data.parent.type})
                  </span>
                  <Button size="sm" variant="outline" onClick={() => router.push(`/org/${data.parent!.id}`)}>
                    Go to
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ==================== TAB: TEAM ==================== */}
        <TabsContent value="team">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">👥 Team ({data.memberCount}/{data.maxMembers})</h3>
                <Button className="gap-2" onClick={() => setInviteOpen(true)} disabled={data.isFull}>
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Button>
              </div>

              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                <div className="col-span-3">Member</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-2">Verification</div>
                <div className="col-span-2">Join Date</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table rows */}
              {data.members
                .sort((a, b) => (ROLE_CONFIG[a.role]?.order ?? 99) - (ROLE_CONFIG[b.role]?.order ?? 99))
                .map((member) => (
                  <div key={member.id} className="grid grid-cols-12 gap-2 px-3 py-3 items-center border-b border-border/50 hover:bg-muted/30 last:border-0">
                    {/* Member */}
                    <div className="col-span-3 flex items-center gap-2">
                      <div className={`h-9 w-9 rounded-full ${ROLE_CONFIG[member.role]?.color || 'bg-gray-500'} flex items-center justify-center text-sm`}>
                        {ROLE_CONFIG[member.role]?.icon || '👤'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{member.user.username || member.user.seatId}</p>
                        <p className="text-xs text-muted-foreground">Seat: {member.user.seatId.slice(0, 8)}...</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="col-span-3">
                      {member.role === 'LEADER' ? (
                        <Badge className="bg-yellow-500 text-black text-xs">
                          {ROLE_CONFIG.LEADER.icon} {ROLE_CONFIG.LEADER.label}
                        </Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.userId, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_CONFIG)
                              .filter(([key]) => key !== 'LEADER')
                              .map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>
                                  {cfg.icon} {cfg.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Verification */}
                    <div className="col-span-2">
                      <Badge className={`text-xs ${member.user.verificationLevel === 'VERIFIED' ? 'bg-green-600' : 'bg-gray-600'}`}>
                        {member.user.verificationLevel || 'NONE'}
                      </Badge>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString('ru-RU')}
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 text-right">
                      {member.role !== 'LEADER' && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1.5 rounded-md hover:bg-red-500/20 text-red-500 transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB: PERMISSIONS ==================== */}
        <TabsContent value="permissions">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-1">🛡️ Матрица Genderномочий</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Each role has a specific set of permissions in the organization
              </p>

              <div className="overflow-x-auto">
                {/* Table header */}
                <div className="grid gap-1 min-w-[700px]" style={{ gridTemplateColumns: `200px repeat(${Object.keys(ROLE_CONFIG).length}, 1fr)` }}>
                  <div className="p-2 text-xs font-bold">Authority</div>
                  {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                    <div key={role} className="p-2 text-center text-xs font-bold">
                      {cfg.icon}<br />{cfg.label}
                    </div>
                  ))}

                  {/* Permission rows */}
                  {Object.entries(PERMISSION_LABELS).map(([perm, label]) => (
                    <React.Fragment key={perm}>
                      <div className="p-2 text-xs border-t border-border/30">{label}</div>
                      {Object.keys(ROLE_CONFIG).map((role) => {
                        const rolePerms = data.permissions.find((p) => p.role === role);
                        const hasPermission = rolePerms ? (rolePerms as any)[perm] : false;
                        return (
                          <div key={role} className="p-2 text-center border-t border-border/30">
                            {hasPermission ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB: ACHIEVEMENTS ==================== */}
        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.achievements.length === 0 ? (
              <div className="col-span-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
                ℹ️ Organization has no achievements yet
              </div>
            ) : (
              data.achievements.map((ach) => (
                <Card key={ach.id} className="text-center py-4">
                  <CardContent>
                    <p className="text-4xl mb-2">🏆</p>
                    <h4 className="font-semibold">{ach.title}</h4>
                    <p className="text-sm text-muted-foreground">{ach.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(ach.awardedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Elections */}
            <div className="col-span-full">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">🗳️ Elections</h3>
                  {data.elections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Election history is empty</p>
                  ) : (
                    <div className="overflow-x-auto">
                      {/* Table header */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                        <div>Status</div>
                        <div>Start</div>
                        <div>End</div>
                        <div>Candidates</div>
                      </div>
                      {data.elections.map((el) => (
                        <div key={el.id} className="grid grid-cols-4 gap-2 px-3 py-2 items-center border-b border-border/50 last:border-0">
                          <div>
                            <Badge className={`text-xs ${el.status === 'COMPLETED' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                              {el.status}
                            </Badge>
                          </div>
                          <div className="text-sm">{new Date(el.startDate).toLocaleDateString('ru-RU')}</div>
                          <div className="text-sm">{new Date(el.endDate).toLocaleDateString('ru-RU')}</div>
                          <div className="text-sm">{el.candidates.length}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ==================== TAB: STRUCTURE ==================== */}
        <TabsContent value="structure">
          <div className="space-y-4">
            {/* Parent */}
            {data.parent && (
              <Card
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => router.push(`/org/${data.parent!.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⬆️</span>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Parent Organization</p>
                      <p className="font-semibold text-lg">{data.parent.name}</p>
                      <Badge variant="outline">{data.parent.type}</Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current */}
            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <p className="text-xs text-primary">← YOU ARE HERE</p>
                    <p className="font-semibold text-lg">{data.name}</p>
                    <Badge>{getTypeLabel(data.type)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Children */}
            {data.children.length > 0 && (
              <>
                <h3 className="font-semibold">⬇️ Divisions ({data.childCount})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.children.map((child) => (
                    <Card
                      key={child.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => router.push(`/org/${child.id}`)}
                    >
                      <CardContent className="pt-4 pb-4">
                        <p className="font-semibold">{child.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{child.type}</Badge>
                          <Badge variant="outline" className="text-xs">⭐ {child.overallRating?.toFixed(1) || '—'}</Badge>
                          <Badge variant="outline" className="text-xs">👥 {child.members?.length || 0}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {data.children.length === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
                ℹ️ This organization has no divisions yet.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================== INVITE DIALOG ==================== */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG)
                    .filter(([k]) => k !== 'LEADER')
                    .map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.icon} {cfg.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteUserId}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
