import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Slider,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { AccountBalance, CalendarToday, TrendingUp } from '@mui/icons-material';
import { arbanAPI } from '../../../lib/api/arban.api';

interface BorrowFormProps {
  arbanId: number;
  type: 'family' | 'org';
  maxAvailable: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const BorrowForm: React.FC<BorrowFormProps> = ({
  arbanId,
  type,
  maxAvailable,
  onSuccess,
  onCancel,
}) => {
  const [amount, setAmount] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [interestRateBps, setInterestRateBps] = useState(1200); // Default 12%
  const [loading, setLoading] = useState(false);
  const [loadingRate, setLoadingRate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadInterestRate();
  }, []);

  const loadInterestRate = async () => {
    setLoadingRate(true);
    try {
      const response = await arbanAPI.credit.admin.getInterestRate();
      setInterestRateBps(response.data.rateBps);
    } catch (err) {
      console.error('Failed to load interest rate:', err);
    } finally {
      setLoadingRate(false);
    }
  };

  const calculateInterest = () => {
    if (!amount || !durationDays) return 0;
    const principal = parseFloat(amount);
    const interest = (principal * interestRateBps * durationDays) / (365 * 10000);
    return interest;
  };

  const interest = calculateInterest();
  const totalDue = parseFloat(amount || '0') + interest;
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + durationDays);

  const handleSubmit = async () => {
    const principal = parseFloat(amount);

    if (!principal || principal <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (principal > maxAvailable) {
      setError(`Insufficient credit. Maximum available: ${maxAvailable.toFixed(2)} ₳`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await arbanAPI.credit[type].borrow(arbanId, amount, durationDays);
      setSuccess(true);
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to borrow');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Loan successfully borrowed!
          </Alert>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Amount:</strong> {parseFloat(amount).toFixed(2)} ₳
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Interest:</strong> {interest.toFixed(2)} ₳
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Total Due:</strong> {totalDue.toFixed(2)} ₳
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Due date: {dueDate.toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h5" component="h2">
            Borrow Funds
          </Typography>
        </Box>

        {loadingRate && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Loading interest rate...
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Amount Input */}
        <TextField
          fullWidth
          label="Amount to Borrow"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          placeholder="0.00"
          helperText={`Maximum available: ${maxAvailable.toFixed(2)} ₳`}
          InputProps={{
            endAdornment: <Typography variant="body2">₳</Typography>,
          }}
          error={parseFloat(amount) > maxAvailable}
          sx={{ mb: 3 }}
        />

        {/* Duration Slider */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Loan Duration: {durationDays} days
          </Typography>
          <Slider
            value={durationDays}
            onChange={(_, value) => setDurationDays(value as number)}
            min={7}
            max={365}
            step={1}
            marks={[
              { value: 7, label: '1W' },
              { value: 30, label: '1M' },
              { value: 90, label: '3M' },
              { value: 180, label: '6M' },
              { value: 365, label: '1Y' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Interest Calculation */}
        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Loan Summary
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Principal
            </Typography>
            <Typography variant="body1">{parseFloat(amount || '0').toFixed(2)} ₳</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Interest Rate (Annual)
            </Typography>
            <Typography variant="body1">{(interestRateBps / 100).toFixed(2)}%</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <CalendarToday sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
              Duration
            </Typography>
            <Typography variant="body1">{durationDays} days</Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <TrendingUp sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
              Interest Due
            </Typography>
            <Typography variant="body1" color="warning.main">
              {interest.toFixed(2)} ₳
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" fontWeight="bold">
              Total Due
            </Typography>
            <Typography variant="h6" color="primary.main">
              {totalDue.toFixed(2)} ₳
            </Typography>
          </Box>
        </Box>

        {/* Due Date */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Due Date:</strong> {dueDate.toLocaleDateString()} at{' '}
            {dueDate.toLocaleTimeString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Repay on time to improve your credit rating (+10 points)
          </Typography>
        </Alert>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {onCancel && (
            <Button variant="outlined" fullWidth onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAvailable || loadingRate}
            startIcon={loading ? <CircularProgress size={20} /> : <AccountBalance />}
          >
            {loading ? 'Processing...' : 'Borrow'}
          </Button>
        </Box>

        {/* Warning */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="error">
            <strong>Warning:</strong> Late payment will decrease your credit rating (-50 points)
            and may affect future borrowing capacity.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
