import { api } from './client';

// Types
export interface TimelineEvent {
  id: string;
  type: string;
  scope: 'INDIVIDUAL' | 'FAMILY' | 'CLAN' | 'TRIBE' | 'NATION';
  scopeId?: string;
  title: string;
  description?: string;
  occurredAt: Date;
  actorId?: string;
  targetId?: string;
  location?: string;
  metadata?: any;
  createdAt: Date;
}

export interface CreateTimelineEventDto {
  type: string;
  scope: TimelineEvent['scope'];
  scopeId?: string;
  title: string;
  description?: string;
  occurredAt?: Date;
  location?: string;
  metadata?: any;
}

export interface TimelineFilters {
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

// API Functions

/**
 * Get timeline events for a user
 */
export async function getUserTimeline(
  userId: string,
  filters?: TimelineFilters
): Promise<TimelineEvent[]> {
  const params = new URLSearchParams();
  
  if (filters?.type) params.append('type', filters.type);
  if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
  if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/timeline/user/${userId}${query}`);
}

/**
 * Get hierarchical timeline for a scope
 */
export async function getHierarchicalTimeline(
  scope: string,
  scopeId: string
): Promise<TimelineEvent[]> {
  return api.get(`/timeline/${scope}/${scopeId}`);
}

/**
 * Create a new timeline event
 */
export async function createTimelineEvent(data: CreateTimelineEventDto): Promise<TimelineEvent> {
  return api.post('/timeline/event', data);
}

/**
 * Get legal contract events
 */
export async function getContracts(): Promise<TimelineEvent[]> {
  return api.get('/timeline/contracts');
}
