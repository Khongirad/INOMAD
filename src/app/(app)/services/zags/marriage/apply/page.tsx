'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  Grid,
  TextField,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack as BackIcon, ArrowForward as NextIcon, Send as SubmitIcon } from '@mui/icons-material';
import { createMarriageApplication, checkMarriageEligibility } from '@/lib/api/zags';
import { toast } from 'react-hot-toast';

const steps = ['Partner Information', 'Marriage Details', 'Property Regime', 'Review & Submit'];

export default function MarriageApplicationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    partnerId: '',
    spouse1FullName: '',
    spouse2FullName: '',
    spouse1DateOfBirth: '',
    spouse2DateOfBirth: '',
    marriageDate: '',
    ceremonyLocation: '',
    ceremonyType: 'Civil' as 'Civil' | 'Religious' | 'Traditional',
    witness1Name: '',
    witness2Name: '',
    witness1Id: '',
    witness2Id: '',
    propertyRegime: 'SEPARATE' as 'SEPARATE' | 'JOINT' | 'CUSTOM',
    propertyAgreement: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!formData.partnerId || !formData.spouse1FullName || !formData.spouse2FullName) {
        setError('Please fill in all partner information');
        return;
      }
      // Check eligibility
      try {
        setLoading(true);
        await checkMarriageEligibility('current-user'); // Should use actual userId
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'You are not eligible to marry');
        setLoading(false);
        return;
      }
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const marriage = await createMarriageApplication(formData);
      toast.success('Marriage application submitted! Waiting for partner consent...');
      router.push('/services/zags');
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/zags')}
          sx={{ mb: 2 }}
        >
          Back to ZAGS
        </Button>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Marriage Application
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Apply for marriage registration - both partners must consent
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        {activeStep === 0 && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Partner Information
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                required
                label="Partner User ID"
                value={formData.partnerId}
                onChange={(e) => handleChange('partnerId', e.target.value)}
                helperText="Enter your partner's username or user ID"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Spouse 1 Full Name"
                value={formData.spouse1FullName}
                onChange={(e) => handleChange('spouse1FullName', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Spouse 2 Full Name"
                value={formData.spouse2FullName}
                onChange={(e) => handleChange('spouse2FullName', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="date"
                label="Spouse 1 Date of Birth"
                value={formData.spouse1DateOfBirth}
                onChange={(e) => handleChange('spouse1DateOfBirth', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="date"
                label="Spouse 2 Date of Birth"
                value={formData.spouse2DateOfBirth}
                onChange={(e) => handleChange('spouse2DateOfBirth', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 1 && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Marriage Details
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="date"
                label="Desired Marriage Date"
                value={formData.marriageDate}
                onChange={(e) => handleChange('marriageDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Must be at least 30 days from today"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Ceremony Type"
                value={formData.ceremonyType}
                onChange={(e) => handleChange('ceremonyType', e.target.value)}
              >
                <MenuItem value="Civil">Civil</MenuItem>
                <MenuItem value="Religious">Religious</MenuItem>
                <MenuItem value="Traditional">Traditional</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Ceremony Location"
                value={formData.ceremonyLocation}
                onChange={(e) => handleChange('ceremonyLocation', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Witness 1 Name"
                value={formData.witness1Name}
                onChange={(e) => handleChange('witness1Name', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Witness 2 Name"
                value={formData.witness2Name}
                onChange={(e) => handleChange('witness2Name', e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {activeStep === 2 && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                Property Regime
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose how property will be managed during marriage
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                select
                label="Property Regime"
                value={formData.propertyRegime}
                onChange={(e) => handleChange('propertyRegime', e.target.value)}
              >
                <MenuItem value="SEPARATE">Separate Property</MenuItem>
                <MenuItem value="JOINT">Joint Property</MenuItem>
                <MenuItem value="CUSTOM">Custom Agreement</MenuItem>
              </TextField>
            </Grid>
            {formData.propertyRegime === 'CUSTOM' && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Property Agreement Details"
                  value={formData.propertyAgreement}
                  onChange={(e) => handleChange('propertyAgreement', e.target.value)}
                  helperText="Describe custom property arrangements"
                />
              </Grid>
            )}
          </Grid>
        )}

        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Submit
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Spouses
                    </Typography>
                    <Typography variant="body1">
                      {formData.spouse1FullName} & {formData.spouse2FullName}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Marriage Date
                    </Typography>
                    <Typography variant="body1">{formData.marriageDate}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Property Regime
                    </Typography>
                    <Typography variant="body1">{formData.propertyRegime}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 3 }}>
              After submission, your partner must consent to this application. You'll both be notified once consent is granted.
            </Alert>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button onClick={handleBack} disabled={activeStep === 0 || loading} startIcon={<BackIcon />}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={<SubmitIcon />}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
              endIcon={<NextIcon />}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
