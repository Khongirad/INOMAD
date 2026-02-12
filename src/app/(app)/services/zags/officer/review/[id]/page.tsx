'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ArrowBack as BackIcon,
  Article as CertificateIcon,
} from '@mui/icons-material';
import {
  getMarriage,
  approveMarriage,
  rejectMarriage,
  type Marriage,
} from '@/lib/api/zags';

export default function MarriageReviewPage() {
  const params = useParams();
  const router = useRouter();
  const marriageId = params?.id as string;

  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review dialog
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');

  useEffect(() => {
    loadMarriage();
  }, [marriageId]);

  const loadMarriage = async () => {
    try {
      setLoading(true);
      const data = await getMarriage(marriageId);
      setMarriage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marriage');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    try {
      setSubmitting(true);
      if (reviewAction === 'APPROVE') {
        await approveMarriage(marriageId, certificateNumber);
      } else {
        await rejectMarriage(marriageId, notes);
      }
      setReviewDialog(false);
      router.push('/services/zags/officer');
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (action: 'APPROVE' | 'REJECT') => {
    setReviewAction(action);
    setReviewDialog(true);
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
        <Alert severity="error">{error || 'Marriage not found'}</Alert>
      </Box>
    );
  }

  const consentComplete = marriage.spouse1ConsentGranted && marriage.spouse2ConsentGranted;

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/zags/officer')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              Marriage Application Review
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {marriage.spouse1FullName} & {marriage.spouse2FullName}
            </Typography>
          </Box>
          <Chip
            label={marriage.status}
            color={marriage.status === 'REGISTERED' ? 'success' : 'warning'}
            size="medium"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Consent Status */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consent Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">{marriage.spouse1FullName}</Typography>
                  <Chip
                    label={marriage.spouse1ConsentGranted ? 'Consented' : 'Pending'}
                    color={marriage.spouse1ConsentGranted ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">{marriage.spouse2FullName}</Typography>
                  <Chip
                    label={marriage.spouse2ConsentGranted ? 'Consented' : 'Pending'}
                    color={marriage.spouse2ConsentGranted ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Stack>
              {!consentComplete && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Dual consent required before officer review. Both parties must consent to proceed.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Marriage Details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Marriage Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Marriage Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(marriage.marriageDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ceremony Type
                  </Typography>
                  <Typography variant="body1">{marriage.ceremonyType || 'Civil'}</Typography>
                </Box>
                {marriage.ceremonyLocation && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Ceremony Location
                    </Typography>
                    <Typography variant="body1">{marriage.ceremonyLocation}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Spouse Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spouses Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Spouse 1
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {marriage.spouse1FullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    DOB: {new Date(marriage.spouse1DateOfBirth).toLocaleDateString()}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Spouse 2
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {marriage.spouse2FullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    DOB: {new Date(marriage.spouse2DateOfBirth).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Property Regime */}
        {marriage.propertyRegime && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Property Regime
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Chip label={marriage.propertyRegime} color="primary" />
                {marriage.propertyAgreement && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Agreement Details
                    </Typography>
                    <Typography variant="body2">{marriage.propertyAgreement}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Certificate Info */}
        {marriage.certificateNumber && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Certificate Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CertificateIcon color="success" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Certificate Number
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {marriage.certificateNumber}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Action Buttons */}
        {marriage.status === 'PENDING_REVIEW' && consentComplete && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Review Actions
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<ApproveIcon />}
                    onClick={() => openReviewDialog('APPROVE')}
                    fullWidth
                  >
                    Approve & Issue Certificate
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    startIcon={<RejectIcon />}
                    onClick={() => openReviewDialog('REJECT')}
                    fullWidth
                  >
                    Reject Application
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'APPROVE' ? 'Approve Marriage' : 'Reject Marriage'}
        </DialogTitle>
        <DialogContent>
          {reviewAction === 'APPROVE' ? (
            <>
              <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
                This will register the marriage and issue an official certificate
              </Alert>
              <TextField
                fullWidth
                label="Certificate Number"
                placeholder="MC-XXXX-XXXX"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                helperText="Generate and assign marriage certificate number"
              />
            </>
          ) : (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Rejection Notes"
              placeholder="Required: Reason for rejection"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleReview}
            variant="contained"
            color={reviewAction === 'APPROVE' ? 'success' : 'error'}
            disabled={
              submitting ||
              (reviewAction === 'APPROVE' && !certificateNumber.trim()) ||
              (reviewAction === 'REJECT' && !notes.trim())
            }
          >
            {submitting ? 'Processing...' : `Confirm ${reviewAction}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
