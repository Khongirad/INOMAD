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
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  getPassportApplication,
  getPassportDocuments,
  reviewPassportApplication,
  type PassportApplication,
  type Document,
} from '@/lib/api/migration';

export default function ApplicationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;

  const [application, setApplication] = useState<PassportApplication | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review dialog
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [passportNumber, setPassportNumber] = useState('');

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const [appData, docsData] = await Promise.all([
        getPassportApplication(applicationId),
        getPassportDocuments(applicationId),
      ]);
      setApplication(appData);
      setDocuments(docsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    try {
      setSubmitting(true);
      await reviewPassportApplication(applicationId, reviewAction, reviewNotes, passportNumber);
      setReviewDialog(false);
      router.push('/services/migration/officer');
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

  if (error || !application) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Application not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/migration/officer')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              Application Review
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {application.passportType} Passport - {application.fullName}
            </Typography>
          </Box>
          <Chip
            label={application.status}
            color={application.status === 'APPROVED' ? 'success' : 'warning'}
            size="medium"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Personal Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Full Name
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {application.fullName}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date of Birth
                  </Typography>
                  <Typography variant="body1">
                    {new Date(application.dateOfBirth).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Sex
                  </Typography>
                  <Typography variant="body1">{application.sex}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nationality
                  </Typography>
                  <Typography variant="body1">{application.nationality}</Typography>
                </Box>
                {application.height && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Height
                    </Typography>
                    <Typography variant="body1">{application.height} cm</Typography>
                  </Box>
                )}
                {application.eyeColor && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Eye Color
                    </Typography>
                    <Typography variant="body1">{application.eyeColor}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Biographical Data */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Biographical Data
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Place of Birth
                  </Typography>
                  <Typography variant="body1">{application.placeOfBirth}</Typography>
                </Box>
                {application.fatherName && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Father's Name
                    </Typography>
                    <Typography variant="body1">{application.fatherName}</Typography>
                  </Box>
                )}
                {application.motherName && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Mother's Name
                    </Typography>
                    <Typography variant="body1">{application.motherName}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {application.address}
                    <br />
                    {application.city}, {application.region} {application.postalCode}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Uploaded Documents (Encrypted)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                All documents are encrypted with AES-256-GCM. Access is logged and audited.
              </Alert>
              <Grid container spacing={2}>
                {documents.length === 0 ? (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      No documents uploaded yet
                    </Typography>
                  </Grid>
                ) : (
                  documents.map((doc) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom>
                            {doc.type.replace('_', ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            variant="outlined"
                            fullWidth
                            sx={{ mt: 1 }}
                          >
                            View (Decrypt)
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Officer Notes (if any) */}
        {application.reviewNotes && (
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Previous Review Notes
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2">{application.reviewNotes}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Action Buttons */}
        {application.status !== 'APPROVED' && application.status !== 'REJECTED' && (
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
                    Approve Application
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
          {reviewAction === 'APPROVE' ? 'Approve Application' : 'Reject Application'}
        </DialogTitle>
        <DialogContent>
          {reviewAction === 'APPROVE' && (
            <TextField
              fullWidth
              label="Passport Number"
              placeholder="SC-XXXX-XXXX"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
              helperText="Generate and assign passport number"
            />
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Review Notes"
            placeholder={
              reviewAction === 'APPROVE'
                ? 'Optional notes for approval'
                : 'Required: Reason for rejection'
            }
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            required={reviewAction === 'REJECT'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleReview}
            variant="contained"
            color={reviewAction === 'APPROVE' ? 'success' : 'error'}
            disabled={submitting || (reviewAction === 'REJECT' && !reviewNotes.trim())}
          >
            {submitting ? 'Processing...' : `Confirm ${reviewAction}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
