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
import { getReceivedInvitations, getSentInvitations, acceptInvitation, rejectInvitation, cancelInvitation } from '@/lib/api';
import { toast } from 'sonner';

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
    setError(null);
    try {
      // Fetch both in parallel
      const [receivedData, sentData] = await Promise.all([
        getReceivedInvitations(),
        getSentInvitations(),
      ]);

      setReceivedInvitations(receivedData);
      setSentInvitations(sentData);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch invitations';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (id: string) => {
    try {
      await acceptInvitation(id);
      toast.success('Invitation accepted!');
      
      // Refresh invitations
      await fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (id: string) => {
    try {
      await rejectInvitation(id);
      toast.warning('Invitation rejected');
      
      // Refresh invitations
      await fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject invitation');
    }
  };

  const handleCancelInvitation = async (id: string) =>{ 
    try {
      await cancelInvitation(id);
      toast.info('Invitation cancelled');
      
      // Refresh invitations
      await fetchInvitations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invitation');
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
