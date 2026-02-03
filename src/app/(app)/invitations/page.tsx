'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  Button,
  Badge,
} from '@mui/material';
import { ReceivedInvitationCard } from '@/components/invitations/ReceivedInvitationCard';
import { SentInvitationCard } from '@/components/invitations/SentInvitationCard';
import { Mail, Send } from 'lucide-react';

export default function InvitationsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [receivedInvitations, setReceivedInvitations] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      // Fetch received invitations
      const receivedRes = await fetch('/api/invitations/received', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!receivedRes.ok) throw new Error('Failed to fetch received invitations');
      const receivedData = await receivedRes.json();

      // Fetch sent invitations
      const sentRes = await fetch('/api/invitations/sent', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!sentRes.ok) throw new Error('Failed to fetch sent invitations');
      const sentData = await sentRes.json();

      setReceivedInvitations(receivedData);
      setSentInvitations(sentData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (id: string) => {
    try {
      const response = await fetch(`/api/invitations/${id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to accept invitation');

      // Refresh invitations
      await fetchInvitations();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleRejectInvitation = async (id: string) => {
    try {
      const response = await fetch(`/api/invitations/${id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to reject invitation');

      // Refresh invitations
      await fetchInvitations();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to cancel invitation');

      // Refresh invitations
      await fetchInvitations();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const pendingReceivedCount = receivedInvitations.filter(
    (inv) => inv.status === 'PENDING'
  ).length;

  const pendingSentCount = sentInvitations.filter(
    (inv) => inv.status === 'PENDING'
  ).length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Приглашения
      </Typography>

      <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
        <Tab
          label={
            <Badge badgeContent={pendingReceivedCount} color="primary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
                <Mail size={20} />
                Полученные
              </Box>
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={pendingSentCount} color="secondary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
                <Send size={20} />
                Отправленные
              </Box>
            </Badge>
          }
        />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tab 0: Received Invitations */}
      {currentTab === 0 && (
        <Box>
          {receivedInvitations.length === 0 ? (
            <Alert severity="info">У вас нет приглашений</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Pending first */}
              {receivedInvitations
                .filter((inv) => inv.status === 'PENDING')
                .map((invitation) => (
                  <ReceivedInvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={handleAcceptInvitation}
                    onReject={handleRejectInvitation}
                  />
                ))}

              {/* Then others */}
              {receivedInvitations
                .filter((inv) => inv.status !== 'PENDING')
                .map((invitation) => (
                  <ReceivedInvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={handleAcceptInvitation}
                    onReject={handleRejectInvitation}
                  />
                ))}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1: Sent Invitations */}
      {currentTab === 1 && (
        <Box>
          {sentInvitations.length === 0 ? (
            <Alert severity="info">Вы еще не отправили приглашений</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sentInvitations.map((invitation) => (
                <SentInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onCancel={handleCancelInvitation}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}
