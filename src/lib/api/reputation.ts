// API client for reputation

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ReputationProfile {
  id: string;
  userId: string;
  user: { id: string; username: string };
  successRate: number;
  averageRating: number;
  totalDeals: number;
  successfulDeals: number;
  ratingsReceived: number;
  questsCompleted: number;
  questsPosted: number;
  contractsSigned: number;
  badges: Array<{
    id: string;
    name: string;
    earnedAt: string;
  }>;
}

export const reputationApi = {
  async getProfile(userId: string): Promise<ReputationProfile> {
    const response = await fetch(`${API_BASE}/reputation/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch reputation');
    return response.json();
  },

  async getHistory(userId: string) {
    const response = await fetch(`${API_BASE}/reputation/${userId}/history`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  },
};
