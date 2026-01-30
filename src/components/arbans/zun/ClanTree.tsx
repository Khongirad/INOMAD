import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { Group, Star, People } from '@mui/icons-material';
import { arbanAPI } from '../../../lib/api/arban.api';

interface Zun {
  zunId: number;
  name: string;
  founderArbanId: number;
  memberArbanIds: number[];
  elderSeatId: number;
  isActive: boolean;
  createdAt: string;
}

interface ClanTreeProps {
  zunId: number;
  onSetElder?: () => void;
}

export const ClanTree: React.FC<ClanTreeProps> = ({ zunId, onSetElder }) => {
  const [zun, setZun] = useState<Zun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadZun();
  }, [zunId]);

  const loadZun = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbanAPI.zun.getZun(zunId);
      setZun(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Zun');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error || !zun) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error || 'Zun not found'}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Group sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5">{zun.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Zun #{zun.zunId}
            </Typography>
          </Box>
          {zun.isActive ? (
            <Chip label="Active" color="success" />
          ) : (
            <Chip label="Inactive" color="default" />
          )}
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Card variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
            <People sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6">{zun.memberArbanIds.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Member Arbans
            </Typography>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, p: 2, textAlign: 'center' }}>
            <Star sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
            <Typography variant="h6">
              {zun.elderSeatId > 0 ? `#${zun.elderSeatId}` : 'None'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Elder
            </Typography>
          </Card>
        </Box>

        {/* Clan Structure Visualization */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Clan Structure
          </Typography>

          {/* Center: Zun Name */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'secondary.main',
                mb: 1,
              }}
            >
              <Group sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6">{zun.name}</Typography>
            {zun.elderSeatId > 0 && (
              <Chip
                icon={<Star />}
                label={`Elder: Seat #${zun.elderSeatId}`}
                size="small"
                color="warning"
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          {/* Member Arbans */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 2,
            }}
          >
            {zun.memberArbanIds.map((arbanId) => (
              <Card
                key={arbanId}
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  bgcolor:
                    arbanId === zun.founderArbanId ? 'warning.light' : 'background.paper',
                  border:
                    arbanId === zun.founderArbanId ? '2px solid' : '1px solid',
                  borderColor:
                    arbanId === zun.founderArbanId ? 'warning.main' : 'divider',
                }}
              >
                <People sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body1">Arban #{arbanId}</Typography>
                {arbanId === zun.founderArbanId && (
                  <Chip
                    label="Founder"
                    size="small"
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                )}
              </Card>
            ))}
          </Box>
        </Box>

        {/* Actions */}
        {!zun.elderSeatId && onSetElder && (
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<Star />}
              onClick={onSetElder}
              fullWidth
            >
              Set Zun Elder
            </Button>
          </Box>
        )}

        {/* Info */}
        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Founded:</strong> {new Date(zun.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Founder Arban:</strong> #{zun.founderArbanId}
          </Typography>
          {zun.elderSeatId > 0 && (
            <Typography variant="body2" color="text.secondary">
              <strong>Elder:</strong> Seat #{zun.elderSeatId}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
