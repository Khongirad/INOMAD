import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  People,
  Person,
  ControlPoint,
  SwapHoriz,
  EmojiEvents,
  HowToVote,
} from '@mui/icons-material';
import { arbanAPI } from '../../lib/api/arban.api';

interface FamilyArban {
  arbanId: number;
  husbandSeatId: number;
  wifeSeatId: number;
  childrenSeatIds: number[];
  heirSeatId: number;
  zunId: number;
  khuralRepSeatId: number;
  khuralRepBirthYear: number;
  isActive: boolean;
  createdAt: string;
}

interface FamilyTreeProps {
  arbanId: number;
  onAddChild?: () => void;
  onChangeHeir?: () => void;
  onSetKhuralRep?: () => void;
}

export const FamilyTree: React.FC<FamilyTreeProps> = ({
  arbanId,
  onAddChild,
  onChangeHeir,
  onSetKhuralRep,
}) => {
  const [arban, setArban] = useState<FamilyArban | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArban();
  }, [arbanId]);

  const loadArban = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbanAPI.family.getFamilyArban(arbanId);
      setArban(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load family arban');
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

  if (error || !arban) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error || 'Family Arban not found'}</Alert>
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const khuralRepAge = arban.khuralRepBirthYear
    ? currentYear - arban.khuralRepBirthYear
    : null;

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Family Arban #{arban.arbanId}</Typography>
            {arban.zunId > 0 && (
              <Chip
                label={`Zun #${arban.zunId}`}
                size="small"
                color="secondary"
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        </Box>

        {/* Parents */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Parents
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 2,
            }}
          >
            <Tooltip title="Husband">
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Person sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="body1">Seat #{arban.husbandSeatId}</Typography>
                {arban.khuralRepSeatId === arban.husbandSeatId && (
                  <Chip
                    icon={<HowToVote />}
                    label={`Khural (${khuralRepAge} yrs)`}
                    size="small"
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Tooltip>

            <Favorite sx={{ fontSize: 32, color: 'error.main' }} />

            <Tooltip title="Wife">
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Person sx={{ fontSize: 48, color: 'secondary.main' }} />
                <Typography variant="body1">Seat #{arban.wifeSeatId}</Typography>
                {arban.khuralRepSeatId === arban.wifeSeatId && (
                  <Chip
                    icon={<HowToVote />}
                    label={`Khural (${khuralRepAge} yrs)`}
                    size="small"
                    color="warning"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Tooltip>
          </Box>
        </Box>

        {/* Children */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Children ({arban.childrenSeatIds.length})
            </Typography>
            {onAddChild && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ControlPoint />}
                onClick={onAddChild}
              >
                Add Child
              </Button>
            )}
          </Box>

          {arban.childrenSeatIds.length === 0 ? (
            <Alert severity="info">No children yet</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {arban.childrenSeatIds.map((childSeatId) => (
                <Card
                  key={childSeatId}
                  variant="outlined"
                  sx={{
                    p: 2,
                    minWidth: 120,
                    textAlign: 'center',
                    bgcolor:
                      childSeatId === arban.heirSeatId ? 'warning.light' : 'background.paper',
                  }}
                >
                  <Person sx={{ fontSize: 32 }} />
                  <Typography variant="body2">Seat #{childSeatId}</Typography>
                  {childSeatId === arban.heirSeatId && (
                    <Chip
                      icon={<EmojiEvents />}
                      label="Heir"
                      size="small"
                      color="warning"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {arban.childrenSeatIds.length > 1 && onChangeHeir && (
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={onChangeHeir}
            >
              Change Heir
            </Button>
          )}
          
          {!arban.khuralRepSeatId && onSetKhuralRep && (
            <Button
              variant="contained"
              startIcon={<HowToVote />}
              onClick={onSetKhuralRep}
              color="warning"
            >
              Set Khural Representative
            </Button>
          )}
        </Box>

        {/* Info */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Created:</strong> {new Date(arban.createdAt).toLocaleDateString()}
          </Typography>
          {arban.khuralRepSeatId > 0 && khuralRepAge && (
            <Typography variant="body2" color="text.secondary">
              <strong>Khural Rep Age:</strong> {khuralRepAge} years
              {khuralRepAge >= 60 && ' ⚠️ Over 60 - must be replaced'}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Missing import
import { Favorite } from '@mui/icons-material';
