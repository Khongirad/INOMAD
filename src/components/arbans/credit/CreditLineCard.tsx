import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { AccountBalance, TrendingUp, Warning } from '@mui/icons-material';
import { arbanAPI } from '../../../lib/api/arban.api';

interface CreditLine {
  arbanId: number;
  creditType: number;
  creditRating: number;
  creditLimit: string;
  borrowed: string;
  available: string;
  totalBorrowed: string;
  totalRepaid: string;
  defaultCount: number;
  onTimeCount: number;
  isActive: boolean;
  openedAt: string;
}

interface CreditLineCardProps {
  arbanId: number;
  type: 'family' | 'org';
  onBorrow?: () => void;
  onViewDashboard?: () => void;
}

export const CreditLineCard: React.FC<CreditLineCardProps> = ({
  arbanId,
  type,
  onBorrow,
  onViewDashboard,
}) => {
  const [creditLine, setCreditLine] = useState<CreditLine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCreditLine();
  }, [arbanId, type]);

  const loadCreditLine = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbanAPI.credit[type].getCreditLine(arbanId);
      setCreditLine(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Credit line not opened yet');
      } else {
        setError(err.response?.data?.message || 'Failed to load credit line');
      }
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

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!creditLine) {
    return null;
  }

  const creditRatingPercent = (creditLine.creditRating / 1000) * 100;
  const utilizationPercent =
    (parseFloat(creditLine.borrowed) / parseFloat(creditLine.creditLimit)) * 100;

  const getCreditRatingColor = (rating: number) => {
    if (rating >= 700) return 'success';
    if (rating >= 500) return 'warning';
    return 'error';
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  return (
    <Card elevation={3}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5">
              {type === 'family' ? 'Family' : 'Organization'} Credit Line
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Arban #{arbanId}
            </Typography>
          </Box>
          {creditLine.isActive ? (
            <Chip label="Active" color="success" />
          ) : (
            <Chip label="Inactive" color="default" />
          )}
        </Box>

        {/* Credit Rating */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Credit Rating
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {creditLine.creditRating} / 1000
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={creditRatingPercent}
            color={getCreditRatingColor(creditLine.creditRating)}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        {/* Amounts */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Credit Limit
              </Typography>
              <Typography variant="h6">{formatAmount(creditLine.creditLimit)} ₳</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Available
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatAmount(creditLine.available)} ₳
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Borrowed
              </Typography>
              <Typography variant="h6" color="error.main">
                {formatAmount(creditLine.borrowed)} ₳
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Utilization
              </Typography>
              <Typography variant="h6">{utilizationPercent.toFixed(1)}%</Typography>
            </Box>
          </Box>
        </Box>

        {/* Utilization Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Credit Utilization
            </Typography>
            <Typography variant="body2">{utilizationPercent.toFixed(1)}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(utilizationPercent, 100)}
            color={utilizationPercent > 80 ? 'error' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Performance Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip
            icon={<TrendingUp />}
            label={`${creditLine.onTimeCount} On-time`}
            color="success"
            variant="outlined"
          />
          {creditLine.defaultCount > 0 && (
            <Chip
              icon={<Warning />}
              label={`${creditLine.defaultCount} Defaults`}
              color="error"
              variant="outlined"
            />
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {onBorrow && (
            <Button
              variant="contained"
              fullWidth
              onClick={onBorrow}
              disabled={parseFloat(creditLine.available) <= 0}
            >
              Borrow
            </Button>
          )}
          {onViewDashboard && (
            <Button variant="outlined" fullWidth onClick={onViewDashboard}>
              View Dashboard
            </Button>
          )}
        </Box>

        {/* Info */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Opened on {new Date(creditLine.openedAt).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
