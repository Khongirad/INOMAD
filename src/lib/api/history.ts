import { api } from './client';

// Types
export interface HistoricalRecord {
  id: string;
  scope: 'INDIVIDUAL' | 'FAMILY' | 'CLAN' | 'TRIBE' | 'NATION';
  scopeId: string;
  periodStart: Date;
  periodEnd?: Date;
  title: string;
  narrative: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    role: string;
  };
  eventIds: string[];
  isPublished: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface CreateHistoryDto {
  scope: HistoricalRecord['scope'];
  scopeId: string;
  periodStart: Date;
  periodEnd?: Date;
  title: string;
  narrative: string;
  eventIds: string[];
}

// API Functions

/**
 * Get historical records for a scope
 */
export async function getHistory(
  scope: string,
  scopeId: string,
  publishedOnly: boolean = true
): Promise<HistoricalRecord[]> {
  return api.get(`/history/${scope}/${scopeId}?publishedOnly=${publishedOnly}`);
}

/**
 * Get current user's narratives
 */
export async function getUserNarratives(): Promise<HistoricalRecord[]> {
  return api.get('/history/my-narratives');
}

/**
 * Create a new historical record
 */
export async function createHistoricalRecord(data: CreateHistoryDto): Promise<HistoricalRecord> {
  return api.post('/history/create', data);
}

/**
 * Update an existing historical record
 */
export async function updateHistoricalRecord(
  recordId: string,
  data: Partial<CreateHistoryDto>
): Promise<HistoricalRecord> {
  return api.put(`/history/${recordId}`, data);
}

/**
 * Delete a historical record
 */
export async function deleteHistoricalRecord(recordId: string): Promise<{ success: boolean }> {
  return api.delete(`/history/${recordId}`);
}

/**
 * Publish a historical record (Admin/Specialist only)
 */
export async function publishHistoricalRecord(recordId: string): Promise<HistoricalRecord> {
  return api.post(`/history/publish/${recordId}`, {});
}
