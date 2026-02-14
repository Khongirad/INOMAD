import { api } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Guild, GuildMember, GuildType } from '@/lib/types/models';

// ==========================================
// RAW API FUNCTIONS
// ==========================================

export const listGuilds = (type?: GuildType) =>
  api.get<Guild[]>(`/guilds${type ? `?type=${type}` : ''}`);

export const getGuild = (id: string) =>
  api.get<Guild>(`/guilds/${id}`);

export const createGuild = (data: { name: string; type: GuildType; description?: string }) =>
  api.post<Guild>('/guilds', data);

export const joinGuild = (id: string) =>
  api.post<GuildMember>(`/guilds/${id}/join`, {});

export const getGuildMembers = (id: string) =>
  api.get<GuildMember[]>(`/guilds/${id}/members`);

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export const useGuilds = (type?: GuildType) =>
  useQuery({
    queryKey: ['guilds', type],
    queryFn: () => listGuilds(type),
  });

export const useGuild = (id: string) =>
  useQuery({
    queryKey: ['guild', id],
    queryFn: () => getGuild(id),
    enabled: !!id,
  });

export const useGuildMembers = (id: string) =>
  useQuery({
    queryKey: ['guildMembers', id],
    queryFn: () => getGuildMembers(id),
    enabled: !!id,
  });

export const useCreateGuild = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGuild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guilds'] }),
  });
};

export const useJoinGuild = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => joinGuild(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guilds'] }),
  });
};
