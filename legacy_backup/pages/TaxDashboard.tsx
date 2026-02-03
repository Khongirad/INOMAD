import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Calculate,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useTaxSystem } from '../hooks/useTaxSystem';
import { calculateTaxBreakdown } from '../lib/api/tax.api';

/**
 * @component TaxDashboard
 * @description Tax system dashboard with statistics and admin controls
 * 
 * Features:
 * - Tax rate display
 * - Tax calculator
 * - Distribution breakdown
 * - Admin controls (TBD)
 */
export const TaxDashboard: React.FC = () => {
  const {
    stats,
    quote,
    fetchStats,
    quoteTax,
    loading,
    error,
  } = useTaxSystem();

  const [calculatorAmount, setCalculatorAmount] = useState<string>('100');
  const [breakdown, setBreakdown] = useState<ReturnType<typeof calculateTaxBreakdown> | null>(null);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCalculate = async () => {
    if (!calculatorAmount) return;
    
    // Get quote from backend
    await quoteTax(calculatorAmount);
    
    // Calculate local breakdown
    const result = calculateTaxBreakdown(parseFloat(calculatorAmount));
    setBreakdown(result);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={2}>
        <AccountBalance fontSize="large" color="primary" />
        Tax System Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        View tax rates, calculate taxes, and manage the tax system
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tax Statistics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <TrendingUp color="primary" />
                  <Typography variant="h6">Total Tax Rate</Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" color="primary.main">
                  {stats.taxRate}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Applied to all transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <AccountBalance color="success" />
                  <Typography variant="h6">Republic Share</Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" color="success.main">
                  {stats.republicShare}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Goes to local republics
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <AccountBalance color="warning" />
                  <Typography variant="h6">Confederation Share</Typography>
                </Box>
                <Typography variant="h2" fontWeight="bold" color="warning.main">
                  {stats.confederationShare}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Goes to confederation budget
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tax Calculator */}
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={1}>
          <Calculate color="primary" />
          Tax Calculator
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Calculate tax breakdown for any amount
        </Typography>

        <Box display="flex" gap={2} alignItems="flex-start" mb={3}>
          <TextField
            label="Amount (ALTAN)"
            type="number"
            value={calculatorAmount}
            onChange={(e) => setCalculatorAmount(e.target.value)}
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Button
            variant="contained"
            onClick={handleCalculate}
            disabled={!calculatorAmount || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Calculate />}
            sx={{ minWidth: 150 }}
          >
            Calculate
          </Button>
        </Box>

        {breakdown && quote && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tax Breakdown
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Original Amount
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {breakdown.amount.toLocaleString()} ALTAN
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Net Amount (After Tax)
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {breakdown.netAmount.toLocaleString()} ALTAN
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Tax
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {breakdown.totalTax.toLocaleString()} ALTAN
                    </Typography>
                    <Chip label={`${stats?.taxRate}%`} size="small" color="error" />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      → Republic Budget
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {breakdown.republicTax.toLocaleString()} ALTAN
                    </Typography>
                    <Chip label={`${stats?.republicShare}%`} size="small" color="success" />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      → Confederation Budget
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="warning.main">
                      {breakdown.confederationTax.toLocaleString()} ALTAN
                    </Typography>
                    <Chip label={`${stats?.confederationShare}%`} size="small" color="warning" />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* How It Works */}
      <Paper elevation={0} sx={{ p: 4, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          How the Tax System Works
        </Typography>
        <Typography variant="body2" paragraph>
          Every transaction in the ALTAN system is subject to a <strong>10% tax</strong>:
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body2" paragraph>
            <strong>7%</strong> goes to the local Republic budget (e.g., Buryat Republic, Sakha Republic)
          </Typography>
          <Typography component="li" variant="body2" paragraph>
            <strong>3%</strong> goes to the Confederative Siberian budget
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          This ensures a sustainable economic flow and funds public services at both local and confederation levels.
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Example:</strong> If you transfer 1000 ALTAN, the recipient gets 900 ALTAN. 
            70 ALTAN goes to the Republic budget, and 30 ALTAN goes to the Confederation budget.
          </Typography>
        </Alert>
      </Paper>

      {/* Admin Panel Placeholder */}
      <Paper elevation={2} sx={{ p: 4, mt: 4, bgcolor: 'warning.light', opacity: 0.7 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={1}>
          <AdminPanelSettings />
          Admin Controls
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Republic configuration and collector permissions (Admin only - Coming soon)
        </Typography>
      </Paper>
    </Container>
  );
};

export default TaxDashboard;
