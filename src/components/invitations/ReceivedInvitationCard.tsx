'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  MessageSquare,
} from 'lucide-react';

interface Invitation {
  id: string;
  guild: {
    id: string;
    name: string;
    type: string;
    fieldOfStudy?: string;
  };
  inviter: {
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
  expiredAt?: Date;
}

interface ReceivedInvitationCardProps {
  invitation: Invitation;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function ReceivedInvitationCard({
  invitation,
  onAccept,
  onReject,
}: ReceivedInvitationCardProps) {
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

  const handleAccept = async () => {
    if (!confirm(`Принять приглашение в гильдию "${invitation.guild.name}"?`)) return;
    await onAccept(invitation.id);
  };

  const handleReject = async () => {
    if (!confirm(`Отклонить приглашение в гильдию "${invitation.guild.name}"?`)) return;
    await onReject(invitation.id);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users size={20} />
              {invitation.guild.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invitation.guild.type}
              {invitation.guild.fieldOfStudy && ` • ${invitation.guild.fieldOfStudy}`}
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
            icon={isPending ? <Clock size={14} /> : undefined}
          />
        </Box>

        {/* Inviter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {invitation.inviter.firstName[0]}
            {invitation.inviter.lastName[0]}
          </Avatar>
          <Box>
            <Typography variant="body2">
              <strong>От:</strong> {invitation.inviter.firstName}{' '}
              {invitation.inviter.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{invitation.inviter.username}
            </Typography>
          </Box>
        </Box>

        {/* Message */}
        {invitation.message && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              <MessageSquare size={14} style={{ display: 'inline', marginRight: 4 }} />
              "{invitation.message}"
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Date */}
        <Typography variant="caption" color="text.secondary">
          {isPending
            ? `Получено: ${new Date(invitation.createdAt).toLocaleDateString('ru-RU')}`
            : invitation.status === 'ACCEPTED'
            ? `Принято: ${new Date(invitation.acceptedAt!).toLocaleDateString('ru-RU')}`
            : invitation.status === 'REJECTED'
            ? `Отклонено: ${new Date(invitation.rejectedAt!).toLocaleDateString('ru-RU')}`
            : `Истекло: ${new Date(invitation.expiredAt!).toLocaleDateString('ru-RU')}`}
        </Typography>

        {/* Action Buttons (only for pending) */}
        {isPending && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle size={16} />}
              onClick={handleAccept}
              fullWidth
            >
              Принять
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<XCircle size={16} />}
              onClick={handleReject}
              fullWidth
            >
              Отклонить
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
