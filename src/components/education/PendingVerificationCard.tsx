'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import { CheckCircle, XCircle, FileText, User, Calendar } from 'lucide-react';

interface PendingVerification {
  id: string;
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  type: 'DIPLOMA' | 'CERTIFICATE' | 'RECOMMENDATION';
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  documentUrl?: string;
  recommender?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
}

interface PendingVerificationCardProps {
  verification: PendingVerification;
  onApprove: (id: string, validForGuilds?: string[]) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function PendingVerificationCard({
  verification,
  onApprove,
  onReject,
}: PendingVerificationCardProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [validGuilds, setValidGuilds] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const guildIds = validGuilds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      
      await onApprove(verification.id, guildIds.length > 0 ? guildIds : undefined);
      setApproveDialogOpen(false);
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Вы уверены, что хотите отклонить эту заявку?')) return;
    
    setLoading(true);
    try {
      await onReject(verification.id);
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DIPLOMA':
        return 'Диплом';
      case 'CERTIFICATE':
        return 'Сертификат';
      case 'RECOMMENDATION':
        return 'Рекомендация';
      default:
        return type;
    }
  };

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6">{verification.fieldOfStudy}</Typography>
              <Typography variant="body2" color="text.secondary">
                {verification.institution}
                {verification.graduationYear && ` • ${verification.graduationYear}`}
              </Typography>
              <Chip
                label={getTypeLabel(verification.type)}
                size="small"
                sx={{ mt: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar size={16} />
              <Typography variant="caption" color="text.secondary">
                {new Date(verification.createdAt).toLocaleDateString('ru-RU')}
              </Typography>
            </Box>
          </Box>

          {/* User Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {verification.user.firstName[0]}
              {verification.user.lastName[0]}
            </Avatar>
            <Box>
              <Typography variant="body2">
                {verification.user.firstName} {verification.user.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                @{verification.user.username} • {verification.user.email}
              </Typography>
            </Box>
          </Box>

          {/* Recommender (if applicable) */}
          {verification.type === 'RECOMMENDATION' && verification.recommender && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <User size={16} />
                <Typography variant="body2">
                  Рекомендовано:{' '}
                  <strong>
                    {verification.recommender.firstName}{' '}
                    {verification.recommender.lastName}
                  </strong>{' '}
                  (@{verification.recommender.username})
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Document Link */}
          {verification.documentUrl && (
            <Button
              variant="outlined"
              size="small"
              href={verification.documentUrl}
              target="_blank"
              startIcon={<FileText size={16} />}
              fullWidth
              sx={{ mb: 2 }}
            >
              Просмотреть Документ
            </Button>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle size={16} />}
              onClick={() => setApproveDialogOpen(true)}
              disabled={loading}
              fullWidth
            >
              Подтвердить
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<XCircle size={16} />}
              onClick={handleReject}
              disabled={loading}
              fullWidth
            >
              Отклонить
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>Подтверждение Образования</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Подтверждаете образование пользователя{' '}
            <strong>
              {verification.user.firstName} {verification.user.lastName}
            </strong>{' '}
            в области <strong>{verification.fieldOfStudy}</strong>?
          </Typography>
          <TextField
            label="Доступно для Гильдий (ID через запятую)"
            value={validGuilds}
            onChange={(e) => setValidGuilds(e.target.value)}
            placeholder="guild-id-1, guild-id-2"
            fullWidth
            helperText="Оставьте пустым, чтобы разрешить для всех гильдий"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={loading}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
