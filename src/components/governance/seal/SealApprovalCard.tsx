import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import { GavelOutlined, CheckCircle, Cancel, PlayArrow } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';

interface Seal {
  id: string;
  title: string;
  description: string;
  signer1: string;
  signer2: string;
  documentHash: string;
  approvals: number;
  executed: boolean;
  createdAt: string;
}

export const SealApprovalCard: React.FC<{ sealId: string; userAddress: string }> = ({
  sealId,
  userAddress,
}) => {
  const [seal, setSeal] = useState<Seal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSeal();
  }, [sealId]);

  const loadSeal = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/digital-seal/${sealId}`);
      setSeal(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load seal');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      await axios.post(`/api/digital-seal/${sealId}/approve`, {
        approverPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setMessage('Seal approved successfully!');
      await loadSeal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve seal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      await axios.post(`/api/digital-seal/${sealId}/revoke`, {
        revokerPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setMessage('Approval revoked successfully!');
      await loadSeal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke approval');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      await axios.post(`/api/digital-seal/${sealId}/execute`, {
        executorPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setMessage('Seal executed successfully!');
      await loadSeal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to execute seal');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !seal) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!seal) {
    return <Alert severity="info">Seal not found</Alert>;
  }

  const isUserSigner = userAddress === seal.signer1 || userAddress === seal.signer2;
  const approvalPercent = (seal.approvals / 2) * 100;

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <GavelOutlined sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5">{seal.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Digital Seal #{sealId}
            </Typography>
          </Box>
          {seal.executed ? (
            <Chip label="EXECUTED" color="success" />
          ) : seal.approvals === 2 ? (
            <Chip label="APPROVED" color="info" />
          ) : (
            <Chip label="PENDING" color="warning" />
          )}
        </Box>

        {/* Messages */}
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1">{seal.description}</Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Signers */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Signers
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                {seal.signer1}
              </Typography>
              {seal.approvals >= 1 && <CheckCircle color="success" fontSize="small" />}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                {seal.signer2}
              </Typography>
              {seal.approvals === 2 && <CheckCircle color="success" fontSize="small" />}
            </Box>
          </Box>
        </Box>

        {/* Approval Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Approval Progress
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {seal.approvals} / 2
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={approvalPercent}
            color={seal.approvals === 2 ? 'success' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        {/* Document Hash */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Document Hash
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', wordBreak: 'break-all', bgcolor: 'background.default', p: 1, borderRadius: 1 }}
          >
            {seal.documentHash}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Actions */}
        {isUserSigner && !seal.executed && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {seal.approvals < 2 && (
              <Button
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={handleApprove}
                disabled={actionLoading}
                fullWidth
              >
                Approve
              </Button>
            )}
            {seal.approvals > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={handleRevoke}
                disabled={actionLoading}
                fullWidth
              >
                Revoke Approval
              </Button>
            )}
          </Box>
        )}

        {seal.approvals === 2 && !seal.executed && isUserSigner && (
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrow />}
            onClick={handleExecute}
            disabled={actionLoading}
            fullWidth
            sx={{ mt: 2 }}
          >
            Execute Contract
          </Button>
        )}

        {seal.executed && (
          <Alert severity="success" sx={{ mt: 2 }}>
            This seal has been executed and is now permanent.
          </Alert>
        )}

        {!isUserSigner && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You are not a signer on this contract.
          </Alert>
        )}

        {/* Metadata */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Created on {new Date(seal.createdAt).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
