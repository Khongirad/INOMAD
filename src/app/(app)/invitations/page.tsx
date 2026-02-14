'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReceivedInvitationCard } from '@/components/invitations/ReceivedInvitationCard';
import { SentInvitationCard } from '@/components/invitations/SentInvitationCard';
import { Mail, Inbox, Send, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  invitedByName?: string;
  invitedUserId: string;
  invitedUserName?: string;
  role: string;
  status: string;
  message?: string;
  createdAt: string;
}

export default function InvitationsPage() {
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invitations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setReceived(data.received || []);
      setSent(data.sent || []);
    } catch {
      toast.error('Ошибка загрузки приглашений');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Приглашение принято');
      fetchInvitations();
    } catch {
      toast.error('Ошибка при принятии');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Приглашение отклонено');
      fetchInvitations();
    } catch {
      toast.error('Ошибка при отклонении');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Приглашение отменено');
      fetchInvitations();
    } catch {
      toast.error('Ошибка при отмене');
    }
  };

  const pendingReceivedCount = received.filter((i) => i.status === 'PENDING').length;
  const pendingSentCount = sent.filter((i) => i.status === 'PENDING').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Mail className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Приглашения</h1>
      </div>

      <Tabs defaultValue="received">
        <TabsList className="mb-6">
          <TabsTrigger value="received" className="gap-2">
            <Inbox className="h-4 w-4" />
            Полученные
            {pendingReceivedCount > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] text-[10px] bg-red-500">
                {pendingReceivedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            Отправленные
            {pendingSentCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-[10px]">
                {pendingSentCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {received.length === 0 ? (
            <div className="text-center py-16">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Нет полученных приглашений</p>
            </div>
          ) : (
            <div className="space-y-3">
              {received.map((inv) => (
                <ReceivedInvitationCard
                  key={inv.id}
                  invitation={inv}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sent.length === 0 ? (
            <div className="text-center py-16">
              <Send className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Нет отправленных приглашений</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sent.map((inv) => (
                <SentInvitationCard
                  key={inv.id}
                  invitation={inv}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
