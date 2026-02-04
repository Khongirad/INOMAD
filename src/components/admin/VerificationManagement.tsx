'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,  
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Network, UserCheck, UserX, Info, TrendingUp } from 'lucide-react';

interface VerificationChainNode {
  userId: string;
  seatId: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  depth: number;
  canVerifyCount: number;
  hasVerifiedCount: number;
}

interface VerificationManagementProps {
  userId: string;
  seatId: string;
  verificationStatus: string;
}

export function VerificationManagement({
  userId,
  seatId,
  verificationStatus,
}: VerificationManagementProps) {
  const [open, setOpen] = useState(false);
  const [chain, setChain] = useState<VerificationChainNode[]>([]);
  const [stats, setStats] = useState<{
    totalVerified: number;
    quota: number;
    used: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      // Fetch verification chain
      const chainRes = await fetch(`/api/verification/chain/${userId}`);
      if (!chainRes.ok) throw new Error('Failed to fetch verification chain');
      const chainData = await chainRes.json();
      setChain(chainData);

      // Fetch verifier stats
      const statsRes = await fetch(`/api/verification/stats?userId=${userId}`);
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeVerification = async () => {
    if (!confirm(`Are you sure you want to revoke verification for ${seatId}?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/verification/revoke/${userId}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to revoke verification');

      alert('Verification revoked successfully');
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="View verification chain and management options">
        <IconButton onClick={handleOpen} size="small" color="primary">
          <Network size={18} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Network size={24} />
            Verification Management - {seatId}
          </Box>
        </DialogTitle>

        <DialogContent>
          {loading && <LinearProgress />}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Current Status */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Status
            </Typography>
            <Chip
              label={verificationStatus}
              color={
                verificationStatus === 'VERIFIED'
                  ? 'success'
                  : verificationStatus === 'PENDING'
                  ? 'warning'
                  : 'default'
              }
              icon={verificationStatus === 'VERIFIED' ? <UserCheck size={16} /> : undefined}
            />
          </Box>

          {/* Verification Chain */}
          {chain.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Verification Chain
              </Typography>
              <Box sx={{ pl: 2 }}>
                {chain.map((node, index) => (
                  <Box
                    key={node.userId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 1,
                      pl: node.depth * 3,
                    }}
                  >
                    {/* Depth indicator */}
                    <Typography variant="body2" color="text.secondary">
                      L{node.depth}
                    </Typography>

                    {/* User info */}
                    <Chip
                      label={node.seatId}
                      size="small"
                      variant={index === 0 ? 'filled' : 'outlined'}
                      color={index === 0 ? 'primary' : 'default'}
                    />

                    {/* Verification info */}
                    {node.verifiedBy && (
                      <Typography variant="caption" color="text.secondary">
                        verified by {node.verifiedBy}
                        {node.verifiedAt && (
                          <> on {new Date(node.verifiedAt).toLocaleDateString()}</>
                        )}
                      </Typography>
                    )}

                    {/* Stats */}
                    <Chip
                      label={`${node.hasVerifiedCount}/${node.canVerifyCount} verified`}
                      size="small"
                      variant="outlined"
                      icon={<TrendingUp size={12} />}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Statistics */}
          {stats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Verifier Statistics
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Verified
                  </Typography>
                  <Typography variant="h5">{stats.totalVerified}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Quota Remaining
                  </Typography>
                  <Typography variant="h5">
                    {stats.quota - stats.used}/{stats.quota}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Usage
                  </Typography>
                  <Typography variant="h5">
                    {Math.round((stats.used / stats.quota) * 100)}%
                  </Typography>
                </Box>
              </Box>

              {/* Quota Progress Bar */}
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((stats.used / stats.quota) * 100, 100)}
                  color={stats.used >= stats.quota ? 'error' : 'primary'}
                />
              </Box>
            </Box>
          )}

          {/* Warning Info */}
          <Alert severity="info" icon={<Info size={18} />} sx={{ mt: 2 }}>
            Revoking verification will remove the user's VERIFIED status and affect all
            users they have verified.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {verificationStatus === 'VERIFIED' && (
            <Button
              onClick={handleRevokeVerification}
              color="error"
              variant="contained"
              startIcon={<UserX size={18} />}
              disabled={loading}
            >
              Revoke Verification
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
