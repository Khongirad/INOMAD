import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
} from '@mui/material';
import { AccountBalance, Savings, TrendingUp } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { ethers } from 'ethers';

interface DonationFormData {
  amount: string;
}

interface BalanceData {
  balance: string;
}

export const DonationPortal: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<DonationFormData>();
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balance, setBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    setBalanceLoading(true);

    try {
      const response = await axios.get<BalanceData>('/api/temple/donations/balance');
      setBalance(response.data.balance);
    } catch (err: any) {
      console.error('Failed to load balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const onSubmit = async (data: DonationFormData) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // Convert ETH to Wei
      const amountWei = ethers.parseEther(data.amount).toString();

      await axios.post('/api/temple/donations', {
        amount: amountWei,
        donorPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setMessage(`Successfully donated ${data.amount} ETH to the Temple!`);
      reset();
      await loadBalance();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to make donation');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (wei: string) => {
    if (wei === '0') return '0';
    try {
      return ethers.formatEther(wei);
    } catch {
      return '0';
    }
  };

  return (
    <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Support the Temple</Typography>
            <Typography variant="body2" color="text.secondary">
              Public Donation Portal
            </Typography>
          </Box>
        </Box>

        {/* Temple Balance */}
        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Temple Treasury Balance
                </Typography>
                {balanceLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white', mt: 1 }} />
                ) : (
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatBalance(balance)} ETH
                  </Typography>
                )}
              </Box>
              <Savings sx={{ fontSize: 60, opacity: 0.5 }} />
            </Box>
          </CardContent>
        </Card>

        {/* Messages */}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Donation Form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            type="number"
            label="Donation Amount"
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 0.001, message: 'Minimum donation is 0.001 ETH' },
            })}
            error={!!errors.amount}
            helperText={errors.amount?.message || 'Enter amount in ETH'}
            InputProps={{
              endAdornment: <InputAdornment position="end">ETH</InputAdornment>,
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            startIcon={<TrendingUp />}
          >
            {loading ? <CircularProgress size={24} /> : 'Make Donation'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Info */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>About Temple Donations:</strong> Public donations support the preservation and 
            verification of records in the Temple of Heaven. Funds are used for:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>
              <Typography variant="body2">Archive maintenance and storage</Typography>
            </li>
            <li>
              <Typography variant="body2">Council member compensation</Typography>
            </li>
            <li>
              <Typography variant="body2">System infrastructure</Typography>
            </li>
            <li>
              <Typography variant="body2">Public access initiatives</Typography>
            </li>
          </Box>
        </Alert>

        {/* Quick Donation Buttons */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Quick Donate
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['0.01', '0.1', '1', '10'].map((amount) => (
              <Button
                key={amount}
                variant="outlined"
                size="small"
                onClick={() => {
                  reset({ amount });
                }}
                disabled={loading}
              >
                {amount} ETH
              </Button>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
