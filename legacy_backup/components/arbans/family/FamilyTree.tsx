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
import { arbadAPI } from '../../lib/api/arbad.api';

interface FamilyArbad {
  arbadId: number;
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
  arbadId: number;
  onAddChild?: () => void;
  onChangeHeir?: () => void;
  onSetKhuralRep?: () => void;
}

export const FamilyTree: React.FC<FamilyTreeProps> = ({
  arbadId,
  onAddChild,
  onChangeHeir,
  onSetKhuralRep,
}) => {
  const [arbad, setArbad] = useState<FamilyArbad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArbad();
  }, [arbadId]);

  const loadArbad = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbadAPI.family.getFamilyArbad(arbadId);
      setArbad(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load family arbad');
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

  if (error || !arbad) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error || 'Family Arbad not found'}</Alert>
        </CardContent>
      </Card>
    );
  }

  const currentYear = new Date().getFullYear();
  const khuralRepAge = arbad.khuralRepBirthYear
    ? currentYear - arbad.khuralRepBirthYear
    : null;

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <People sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Family Arbad #{arbad.arbadId}</Typography>
            {arbad.zunId > 0 && (
              <Chip
                label={`Zun #${arbad.zunId}`}
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
                <Typography variant="body1">Seat #{arbad.husbandSeatId}</Typography>
                {arbad.khuralRepSeatId === arbad.husbandSeatId && (
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
                <Typography variant="body1">Seat #{arbad.wifeSeatId}</Typography>
                {arbad.khuralRepSeatId === arbad.wifeSeatId && (
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
              Children ({arbad.childrenSeatIds.length})
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

          {arbad.childrenSeatIds.length === 0 ? (
            <Alert severity="info">No children yet</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {arbad.childrenSeatIds.map((childSeatId) => (
                <Card
                  key={childSeatId}
                  variant="outlined"
                  sx={{
                    p: 2,
                    minWidth: 120,
                    textAlign: 'center',
                    bgcolor:
                      childSeatId === arbad.heirSeatId ? 'warning.light' : 'background.paper',
                  }}
                >
                  <Person sx={{ fontSize: 32 }} />
                  <Typography variant="body2">Seat #{childSeatId}</Typography>
                  {childSeatId === arbad.heirSeatId && (
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
          {arbad.childrenSeatIds.length > 1 && onChangeHeir && (
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={onChangeHeir}
            >
              Change Heir
            </Button>
          )}
          
          {!arbad.khuralRepSeatId && onSetKhuralRep && (
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
            <strong>Created:</strong> {new Date(arbad.createdAt).toLocaleDateString()}
          </Typography>
          {arbad.khuralRepSeatId > 0 && khuralRepAge && (
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
