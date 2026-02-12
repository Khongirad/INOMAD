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
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { getMyPassportApplications, lookupPassport, type PassportApplication } from '@/lib/api/migration';
import ApplicationStatusCard from '@/components/migration/ApplicationStatusCard';

export default function MigrationServicePage() {
  const router = useRouter();
  const [applications, setApplications] = useState<PassportApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Passport lookup
  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getMyPassportApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupNumber.trim()) return;
    
    try {
      setLookupLoading(true);
      const result = await lookupPassport(lookupNumber);
      setLookupResult(result);
    } catch (err: any) {
      setLookupResult({ exists: false, error: err.message });
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Migration Service
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Apply for passports, manage your applications, and verify documents
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Info Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📘 Standard Passport
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For regular citizens. Valid for 10 years. Allows international travel to all partner nations.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => router.push('/services/migration/apply?type=STANDARD')}
              >
                Apply Now
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎖️ Diplomatic Passport
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For government officials and diplomats. Special privileges and immunities.
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                disabled
                sx={{ mt: 2 }}
              >
                Requires Nomination
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🛂 Service Passport
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For public service employees on official duty abroad.
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                disabled
                sx={{ mt: 2 }}
              >
                Requires Authorization
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Your Applications */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Your Applications
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/services/migration/apply')}
            >
              New Application
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : applications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                You haven't submitted any passport applications yet
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                sx={{ mt: 2 }}
                onClick={() => router.push('/services/migration/apply')}
              >
                Apply for Passport
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {applications.map((app) => (
                <ApplicationStatusCard
                  key={app.id}
                  application={app}
                  onClick={() => router.push(`/services/migration/applications/${app.id}`)}
                />
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Passport Lookup */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Passport Verification
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Verify the validity of a Siberian Confederation passport (public lookup)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Passport Number"
              placeholder="SC-XXXX-XXXX"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
            />
            <Button
              variant="contained"
              startIcon={lookupLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={handleLookup}
              disabled={lookupLoading || !lookupNumber.trim()}
              sx={{ minWidth: 120 }}
            >
              Verify
            </Button>
          </Box>

          {lookupResult && (
            <Alert
              severity={lookupResult.exists ? 'success' : 'warning'}
              sx={{ mt: 2 }}
            >
              {lookupResult.exists ? (
                <>
                  <Typography variant="body2" fontWeight={600}>
                    Valid Passport Found
                  </Typography>
                  <Typography variant="body2">
                    Holder: {lookupResult.fullName}
                  </Typography>
                  {lookupResult.expiresAt && (
                    <Typography variant="body2">
                      Expires: {new Date(lookupResult.expiresAt).toLocaleDateString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2">
                  {lookupResult.error || 'Passport not found or invalid'}
                </Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
