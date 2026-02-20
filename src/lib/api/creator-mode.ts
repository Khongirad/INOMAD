import { api } from './client';

// ── Types ──────────────────────────────────────────────────────────────────

export type PowerBranch = 'LEGISLATIVE' | 'EXECUTIVE' | 'JUDICIAL' | 'BANKING' | 'NONE';
export type ProvisionalStatus = 'ACTIVE' | 'TRANSFERRED' | 'DISSOLVED';

export interface ProvisionalRole {
  id: string;
  branch: PowerBranch;
  roleName: string;
  roleDisplayName?: string;
  orgId?: string;
  status: ProvisionalStatus;
  startedAt: string;
  endedAt?: string;
  transferredToId?: string;
  transferAct?: string;
  transferNote?: string;
}

export interface GovernanceStatus {
  isFormationPeriod: boolean;
  banner: string | null;
  branches: {
    branch: PowerBranch;
    isProvisional: boolean;
    provisionalRoles: { roleName: string; roleDisplayName?: string; startedAt: string }[];
    transferredRoles: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  provisionalRole: { branch: PowerBranch; roleName: string; roleDisplayName?: string };
}

// ── Public endpoints (no auth needed) ─────────────────────────────────────

export const getGovernanceStatus = (): Promise<GovernanceStatus> =>
  api.get<GovernanceStatus>('/creator/governance-status');

export const getActiveProvisionalRoles = (): Promise<ProvisionalRole[]> =>
  api.get<ProvisionalRole[]>('/creator/active-roles');

export const getCreatorAuditLog = (page = 1, limit = 50) =>
  api.get<{ data: AuditLogEntry[]; total: number }>(`/creator/audit-log?page=${page}&limit=${limit}`);

// ── Creator-only endpoints ─────────────────────────────────────────────────

export const assumeRole = (body: {
  branch: PowerBranch;
  roleName: string;
  roleDisplayName?: string;
  orgId?: string;
}): Promise<ProvisionalRole> => api.post<ProvisionalRole>('/creator/assume-role', body);

export const initiateTransfer = (body: {
  provisionalRoleId: string;
  transferredToId: string;
  transferNote?: string;
}): Promise<ProvisionalRole> => api.post<ProvisionalRole>('/creator/initiate-transfer', body);

export const signTransferAct = (roleId: string): Promise<ProvisionalRole> =>
  api.post<ProvisionalRole>(`/creator/sign-transfer-act/${roleId}`, {});

export const setRoleDisplayName = (roleId: string, displayName: string): Promise<ProvisionalRole> =>
  api.post<ProvisionalRole>(`/creator/set-role-name/${roleId}`, { displayName });

export const getMyProvisionalRoles = (): Promise<ProvisionalRole[]> =>
  api.get<ProvisionalRole[]>('/creator/my-roles');
