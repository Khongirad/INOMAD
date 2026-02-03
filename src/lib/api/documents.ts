// API client for chancellery/documents

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Document {
  id: string;
  title: string;
  status: string;
  content: string;
  metadata: any;
  templateId: string;
  template: {
    id: string;
    name: string;
    type: string;
  };
  creatorId: string;
  creator: { id: string; username: string };
  recipientIds: string[];
  witnessIds: string[];
  signatures: Array<{
    id: string;
    signerId: string;
    signer: { id: string; username: string };
    role: string;
    signedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const documentApi = {
  async create(data: {
    templateId: string;
    metadata: any;
    recipientIds: string[];
    witnessIds?: string[];
  }) {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create document');
    return response.json();
  },

  async getMyDocuments(filters?: { status?: string; type?: string }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE}/documents/my?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },

  async getById(id: string): Promise<Document> {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch document');
    return response.json();
  },

  async sign(id: string, signature: string) {
    const response = await fetch(`${API_BASE}/documents/${id}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ signature }),
    });
    if (!response.ok) throw new Error('Failed to sign document');
    return response.json();
  },
};
