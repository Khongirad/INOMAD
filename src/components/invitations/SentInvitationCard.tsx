'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import { Mail, CheckCircle, XCircle, Clock, Users, Trash2 } from 'lucide-react';

interface Invitation {
  id: string;
  guild: {
    id: string;
    name: string;
  };
  invitee: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

interface SentInvitationCardProps {
  invitation: Invitation;
  onCancel: (id: string) => Promise<void>;
}

export function SentInvitationCard({ invitation, onCancel }: SentInvitationCardProps) {
  const isPending = invitation.status === 'PENDING';

  const getStatusColor = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPIRED':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return 'Принято';
      case 'REJECTED':
        return 'Отклонено';
      case 'EXPIRED':
        return 'Истекло';
      default:
        return 'Ожидает ответа';
    }
  };

  const getStatusIcon = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return <CheckCircle size={14} />;
      case 'REJECTED':
        return <XCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const handleCancel = async () => {
    if (!confirm('Отменить приглашение?')) return;
    await onCancel(invitation.id);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {invitation.invitee.firstName} {invitation.invitee.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{invitation.invitee.username}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={getStatusLabel()}
              color={getStatusColor()}
              size="small"
              icon={getStatusIcon()}
            />
            {isPending && (
              <IconButton size="small" color="error" onClick={handleCancel}>
                <Trash2 size={16} />
              </IconButton>
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Гильдия:
          </Typography>
          <Typography variant="body2">{invitation.guild.name}</Typography>
        </Box>

        {invitation.message && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Сообщение:
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              "{invitation.message}"
            </Typography>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary">
          {isPending
            ? `Отправлено: ${new Date(invitation.createdAt).toLocaleDateString('ru-RU')}`
            : invitation.status === 'ACCEPTED'
            ? `Принято: ${new Date(invitation.acceptedAt!).toLocaleDateString('ru-RU')}`
            : `Отклонено: ${new Date(invitation.rejectedAt!).toLocaleDateString('ru-RU')}`}
        </Typography>
      </CardContent>
    </Card>
  );
}
