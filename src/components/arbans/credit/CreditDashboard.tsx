import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  AccountBalance,
} from '@mui/icons-material';
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
}

interface Loan {
  loanId: number;
  principal: string;
  interest: string;
  totalDue: string;
  dueDate: string;
  borrowedAt: string;
  repaidAt: string | null;
  isActive: boolean;
  isDefaulted: boolean;
}

interface CreditDashboard {
  creditLine: CreditLine;
  activeLoans: Loan[];
  loanHistory: Loan[];
  performance: {
    onTimeRate: number;
    defaultRate: number;
    avgRepaymentDays: number;
  };
}

interface CreditDashboardProps {
  arbanId: number;
  type: 'family' | 'org';
}

export const CreditDashboard: React.FC<CreditDashboardProps> = ({ arbanId, type }) => {
  const [dashboard, setDashboard] = useState<CreditDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [arbanId, type]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbanAPI.credit[type].getDashboard(arbanId);
      setDashboard(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
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

  if (error || !dashboard) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error || 'Dashboard data not available'}</Alert>
        </CardContent>
      </Card>
    );
  }

  const { creditLine, activeLoans, loanHistory, performance } = dashboard;
  const utilizationPercent =
    (parseFloat(creditLine.borrowed) / parseFloat(creditLine.creditLimit)) * 100;
  const creditRatingPercent = (creditLine.creditRating / 1000) * 100;

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" sx={{ mb: 3 }}>
        Credit Dashboard
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Credit Limit
                </Typography>
              </Box>
              <Typography variant="h5">{formatAmount(creditLine.creditLimit)} ₳</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Available
                </Typography>
              </Box>
              <Typography variant="h5" color="success.main">
                {formatAmount(creditLine.available)} ₳
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingDown sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Borrowed
                </Typography>
              </Box>
              <Typography variant="h5" color="error.main">
                {formatAmount(creditLine.borrowed)} ₳
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="text.secondary">
                  Active Loans
                </Typography>
              </Box>
              <Typography variant="h5">{activeLoans.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Credit Rating & Utilization */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Credit Rating
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ mr: 2 }}>
                  {creditLine.creditRating}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / 1000
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={creditRatingPercent}
                color={
                  creditLine.creditRating >= 700
                    ? 'success'
                    : creditLine.creditRating >= 500
                    ? 'warning'
                    : 'error'
                }
                sx={{ height: 12, borderRadius: 6 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Chip
                  icon={<CheckCircle />}
                  label={`${creditLine.onTimeCount} On-time`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<ErrorIcon />}
                  label={`${creditLine.defaultCount} Defaults`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Credit Utilization
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ mr: 2 }}>
                  {utilizationPercent.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {formatAmount(creditLine.creditLimit)} ₳
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(utilizationPercent, 100)}
                color={utilizationPercent > 80 ? 'error' : 'primary'}
                sx={{ height: 12, borderRadius: 6 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {utilizationPercent > 80
                  ? '⚠️ High utilization - consider repaying loans'
                  : '✓ Healthy utilization'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Performance Metrics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.dark', mb: 1 }} />
                <Typography variant="h3" color="success.dark">
                  {performance.onTimeRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="success.dark">
                  On-time Repayment Rate
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                <ErrorIcon sx={{ fontSize: 48, color: 'error.dark', mb: 1 }} />
                <Typography variant="h3" color="error.dark">
                  {performance.defaultRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="error.dark">
                  Default Rate
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                <Schedule sx={{ fontSize: 48, color: 'info.dark', mb: 1 }} />
                <Typography variant="h3" color="info.dark">
                  {performance.avgRepaymentDays.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="info.dark">
                  Avg. Repayment Days
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loan History Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Loan History Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total Borrowed
              </Typography>
              <Typography variant="h6">
                {formatAmount(creditLine.totalBorrowed)} ₳
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total Repaid
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatAmount(creditLine.totalRepaid)} ₳
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total Loans
              </Typography>
              <Typography variant="h6">
                {activeLoans.length + loanHistory.length}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Completed Loans
              </Typography>
              <Typography variant="h6">{loanHistory.length}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
