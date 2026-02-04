import { api } from '../api';

// ==========================================
// TYPES
// ==========================================

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface GuildInvitation {
  id: string;
  guildId: string;
  inviterId: string;
  inviteeId: string;
  status: InvitationStatus;
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
  expiresAt?: Date;
  guild?: {
    id: string;
    name: string;
    type: string;
  };
  inviter?: {
    id: string;
    username: string;
    seatId?: string;
  };
  invitee?: {
    id: string;
    username: string;
    seatId?: string;
  };
}

export interface SendInvitationDto {
  guildId: string;
  inviteeId: string;
  message?: string;
}

export interface InvitationChain {
  userId: string;
  username: string;
  seatId?: string;
  depth: number;
  invitedBy?: string;
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Send guild invitation
 */
export const sendInvitation = async (data: SendInvitationDto): Promise<GuildInvitation> => {
  return api.post<GuildInvitation>('/invitations/send', data);
};

/**
 * Accept invitation
 */
export const acceptInvitation = async (id: string): Promise<GuildInvitation> => {
  return api.post<GuildInvitation>(`/invitations/${id}/accept`, {});
};

/**
 * Reject invitation
 */
export const rejectInvitation = async (id: string, reason?: string): Promise<GuildInvitation> => {
  return api.post<GuildInvitation>(`/invitations/${id}/reject`, { reason });
};

/**
 * Delete/cancel invitation (for inviter)
 */
export const cancelInvitation = async (id: string): Promise<void> => {
  return api.post<void>(`/invitations/${id}`, { _method: 'DELETE' });
};

/**
 * Get invitations I've sent
 */
export const getSentInvitations = async (): Promise<GuildInvitation[]> => {
  return api.get<GuildInvitation[]>('/invitations/sent');
};

/**
 * Get invitations I've received
 */
export const getReceivedInvitations = async (): Promise<GuildInvitation[]> => {
  return api.get<GuildInvitation[]>('/invitations/received');
};

/**
 * Get all invitations for a specific guild
 */
export const getGuildInvitations = async (guildId: string): Promise<GuildInvitation[]> => {
  return api.get<GuildInvitation[]>(`/invitations/guild/${guildId}`);
};

/**
 * Get invitation chain (how user joined guild through invitations)
 */
export const getInvitationChain = async (
  userId: string,
  guildId: string
): Promise<InvitationChain[]> => {
  return api.get<InvitationChain[]>(`/invitations/chain/${userId}/${guildId}`);
};

/**
 * Expire old pending invitations (admin/cron)
 */
export const expireInvitations = async (): Promise<{ expired: number }> => {
  return api.post<{ expired: number }>('/invitations/expire', {});
};
