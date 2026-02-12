'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { getMarriage, grantMarriageConsent } from '@/lib/api/zags';
import { toast } from 'react-hot-toast';

export default function MarriageConsentPage() {
  const params = useParams();
  const router = useRouter();
  const marriageId = params?.id as string;

  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarriage();
  }, [marriageId]);

  const loadMarriage = async () => {
    try {
      setLoading(true);
      const data = await getMarriage(marriageId);
      setMarriage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marriage application');
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = async (approve: boolean) => {
    if (approve && !signature.trim()) {
      toast.error('Please enter your digital signature');
      return;
    }

    try {
      setSubmitting(true);
      await grantMarriageConsent(marriageId, approve, signature);
      toast.success(approve ? 'Consent granted successfully!' : 'Application rejected');
      router.push('/services/zags');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process consent');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !marriage) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Marriage application not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<BackIcon />} onClick={() => router.push('/services/zags')} sx={{ mb: 2 }}>
          Back to ZAGS
        </Button>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Marriage Consent
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and consent to this marriage application
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Your partner has submitted a marriage application. Please review the details and provide your consent.
        </Alert>

        <Grid container spacing={3}>
          <Grid size={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Spouses
                </Typography>
                <Typography variant="h6">
                  {marriage.spouse1FullName} & {marriage.spouse2FullName}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Spouse 1 Date of Birth
                </Typography>
                <Typography variant="body1">
                  {new Date(marriage.spouse1DateOfBirth).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Spouse 2 Date of Birth
                </Typography>
                <Typography variant="body1">
                  {new Date(marriage.spouse2DateOfBirth).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Desired Marriage Date
                </Typography>
                <Typography variant="body1">
                  {new Date(marriage.marriageDate).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {marriage.ceremonyLocation && (
            <Grid size={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ceremony Location
                  </Typography>
                  <Typography variant="body1">{marriage.ceremonyLocation}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid size={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Property Regime
                </Typography>
                <Typography variant="body1">{marriage.propertyRegime || 'SEPARATE'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Digital Signature
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your full name as digital signature to consent to this marriage
          </Typography>
          <TextField
            fullWidth
            label="Your Full Name (Digital Signature)"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Enter your full name exactly as it appears on your ID"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<RejectIcon />}
            onClick={() => handleConsent(false)}
            disabled={submitting}
          >
            Reject Application
          </Button>
          <Button
            variant="contained"
            color="success"
            fullWidth
            startIcon={<ApproveIcon />}
            onClick={() => handleConsent(true)}
            disabled={submitting || !signature.trim()}
          >
            {submitting ? 'Processing...' : 'Grant Consent'}
          </Button>
        </Box>
      </Paper>

      <Alert severity="warning">
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Important Legal Notice
        </Typography>
        <Typography variant="body2">
          By granting consent, you agree to enter into a legally binding marriage. This action cannot be undone without proper divorce proceedings. Make sure all information is correct before proceeding.
        </Typography>
      </Alert>
    </Box>
  );
}
