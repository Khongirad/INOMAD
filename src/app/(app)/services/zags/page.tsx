'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Favorite as MarriedIcon,
  Person as SingleIcon,
  HeartBroken as DivorIcon,
  Search as SearchIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import {
  getMyMarriages,
  getPendingConsents,
  verifyCertificate,
  type Marriage,
  type MarriageConsent,
  type CivilStatus,
} from '@/lib/api/zags';
import CivilStatusBadge from '@/components/zags/CivilStatusBadge';

export default function ZAGSPage() {
  const router = useRouter();
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [pendingConsents, setPendingConsent] = useState<MarriageConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Certificate verification
  const [certNumber, setCertNumber] = useState('');
  const [certResult, setCertResult] = useState<any>(null);
  const [certLoading, setCertLoading] = useState(false);

  // User's current civil status (mock - should come from main User profile)
  const [civilStatus, setCivilStatus] = useState<CivilStatus>('SINGLE');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [marriagesData, consentsData] = await Promise.all([
        getMyMarriages(),
        getPendingConsents(),
      ]);
      setMarriages(marriagesData);
      setPendingConsents(consentsData);

      // Determine civil status
      const activeMarriage = marriagesData.find((m) => m.status === 'REGISTERED');
      if (activeMarriage) {
        setCivilStatus('MARRIED');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCertificate = async () => {
    if (!certNumber.trim()) return;

    try {
      setCertLoading(true);
      const result = await verifyCertificate(certNumber);
      setCertResult(result);
    } catch (err: any) {
      setCertResult({ isValid: false, error: err.message });
    } finally {
      setCertLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          ZAGS - Civil Registry Office
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Marriage registration, divorce filing, and civil status management
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Civil Status Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Your Civil Status
              </Typography>
              <CivilStatusBadge status={civilStatus} />
            </Box>

            {civilStatus === 'SINGLE' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/services/zags/marriage/apply')}
              >
                Apply for Marriage
              </Button>
            )}

            {civilStatus === 'MARRIED' && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => router.push('/services/zags/divorce/apply')}
              >
                File for Divorce
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Pending Consents */}
      {pendingConsents.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Consent Requests
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              You have {pendingConsents.length} marriage application(s) waiting for your consent
            </Alert>
            <Stack spacing={2}>
              {pendingConsents.map((consent) => (
                <Card key={consent.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Marriage Application
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Submitted: {new Date(consent.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        onClick={() => router.push(`/services/zags/marriage/consent/${consent.marriageId}`)}
                      >
                        Review & Consent
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Your Marriages */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Marriage Records
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : marriages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No marriage records found
              </Typography>
              {civilStatus === 'SINGLE' && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/services/zags/marriage/apply')}
                >
                  Apply for Marriage
                </Button>
              )}
            </Box>
          ) : (
            <Stack spacing={2}>
              {marriages.map((marriage) => (
                <Card key={marriage.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {marriage.spouse1FullName} & {marriage.spouse2FullName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Marriage Date: {new Date(marriage.marriageDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Certificate: {marriage.certificateNumber}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          label={marriage.status}
                          color={marriage.status === 'REGISTERED' ? 'success' : 'default'}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        {marriage.status === 'REGISTERED' && (
                          <Box>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => router.push(`/services/zags/certificates?cert=${marriage.certificateNumber}`)}
                            >
                              View Certificate
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Certificate Verification */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Certificate Verification
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Verify the authenticity of a marriage or divorce certificate (public lookup)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Certificate Number"
              placeholder="MC-XXXX-XXXX or DC-XXXX-XXXX"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyCertificate()}
            />
            <Button
              variant="contained"
              startIcon={certLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={handleVerifyCertificate}
              disabled={certLoading || !certNumber.trim()}
              sx={{ minWidth: 120 }}
            >
              Verify
            </Button>
          </Box>

          {certResult && (
            <Alert
              severity={certResult.isValid ? 'success' : 'warning'}
              icon={certResult.isValid ? <VerifiedIcon /> : undefined}
              sx={{ mt: 2 }}
            >
              {certResult.isValid ? (
                <>
                  <Typography variant="body2" fontWeight={600}>
                    Valid {certResult.type} Certificate
                  </Typography>
                  {certResult.details && (
                    <>
                      <Typography variant="body2">
                        Spouses: {certResult.details.spouse1Name} & {certResult.details.spouse2Name}
                      </Typography>
                      <Typography variant="body2">
                        Marriage Date: {new Date(certResult.details.marriageDate).toLocaleDateString()}
                      </Typography>
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Issued: {new Date(certResult.issuedDate).toLocaleDateString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">
                  {certResult.error || 'Certificate not found or invalid'}
                </Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Marriage Requirements
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Both parties must be 18+ years old<br />
                • Both parties must be single (not currently married)<br />
                • Dual consent required from both partners<br />
                • ZAGS officer review and approval<br />
                • Blockchain-backed certificates
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ⚖️ Divorce Process
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • File divorce application online<br />
                • Property division agreement (optional)<br />
                • ZAGS officer review<br />
                • Certificate issued upon finalization<br />
                • Civil status updated automatically
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
