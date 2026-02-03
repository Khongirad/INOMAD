// API client for quests

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: Array<{
    description: string;
    completed: boolean;
    evidence?: string;
  }>;
  status: string;
  progress: number;
  giverId: string;
  giver: { id: string; username: string };
  takerId?: string;
  taker?: { id: string; username: string };
  rewardAltan?: number;
  reputationGain?: number;
  deadline?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export const questApi = {
  async create(data: {
    title: string;
    description: string;
    objectives: Array<{ description: string }>;
    rewardAltan?: number;
    reputationGain?: number;
    deadline?: string;
  }) {
    const response = await fetch(`${API_BASE}/quests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create quest');
    return response.json();
  },

  async getAvailable(filters?: { minReward?: number }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE}/quests/available?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch quests');
    return response.json();
  },

  async getMy(role?: 'giver' | 'taker' | 'all') {
    const params = new URLSearchParams({ role: role || 'all' });
    const response = await fetch(`${API_BASE}/quests/my?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch my quests');
    return response.json();
  },

  async getById(id: string): Promise<Quest> {
    const response = await fetch(`${API_BASE}/quests/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch quest');
    return response.json();
  },

  async accept(id: string) {
    const response = await fetch(`${API_BASE}/quests/${id}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to accept quest');
    return response.json();
  },

  async updateProgress(id: string, objectives: any[]) {
    const response = await fetch(`${API_BASE}/quests/${id}/progress`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ objectives }),
    });
    if (!response.ok) throw new Error('Failed to update progress');
    return response.json();
  },

  async submit(id: string, evidence: any[]) {
    const response = await fetch(`${API_BASE}/quests/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ evidence }),
    });
    if (!response.ok) throw new Error('Failed to submit quest');
    return response.json();
  },

  async approve(id: string, rating: number, feedback?: string) {
    const response = await fetch(`${API_BASE}/quests/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ rating, feedback }),
    });
    if (!response.ok) throw new Error('Failed to approve quest');
    return response.json();
  },

  async reject(id: string, feedback: string) {
    const response = await fetch(`${API_BASE}/quests/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ feedback }),
    });
    if (!response.ok) throw new Error('Failed to reject quest');
    return response.json();
  },
};
