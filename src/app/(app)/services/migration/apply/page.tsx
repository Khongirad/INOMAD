'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { ArrowBack as BackIcon, ArrowForward as NextIcon, Send as SubmitIcon } from '@mui/icons-material';
import PassportApplicationForm from '@/components/migration/PassportApplicationForm';
import { createPassportApplication, submitPassportApplication } from '@/lib/api/migration';
import { toast } from 'react-hot-toast';

const steps = [
  'Personal Information',
  'Biographical Data',
  'Document Upload',
  'Review & Confirm',
];

export default function PassportApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passportType = (searchParams?.get('type') || 'STANDARD') as 'STANDARD' | 'DIPLOMATIC' | 'SERVICE';

  const [activeStep, setActiveStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'Siberian Confederation',
    sex: '',
    height: undefined as number | undefined,
    eyeColor: '',
    fatherName: '',
    motherName: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    passportType,
    previousPassportNumber: '',
  });

  const handleNext = async () => {
    // Validation for each step
    if (activeStep === 0) {
      if (!formData.fullName || !formData.dateOfBirth || !formData.sex) {
        setError('Please fill in all required personal information fields');
        return;
      }
    }

    if (activeStep === 1) {
      if (!formData.placeOfBirth) {
        setError('Please fill in biographical data');
        return;
      }
    }

    // On first step completion, create draft application
    if (activeStep === 0 && !applicationId) {
      try {
        setLoading(true);
        const application = await createPassportApplication(formData);
        setApplicationId(application.id);
        toast.success('Application draft created');
      } catch (err: any) {
        setError(err.message || 'Failed to create application');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
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
    if (!applicationId) {
      setError('Application not created');
      return;
    }

    try {
      setLoading(true);
      await submitPassportApplication(applicationId);
      toast.success('Application submitted successfully!');
      router.push(`/services/migration/applications/${applicationId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/migration')}
          sx={{ mb: 2 }}
        >
          Back to Migration Service
        </Button>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Passport Application
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {passportType} Passport - Complete all steps to submit your application
        </Typography>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
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

        {/* Form Content */}
        <PassportApplicationForm
          step={activeStep}
          formData={formData}
          onChange={setFormData}
          applicationId={applicationId}
        />

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || loading}
            startIcon={<BackIcon />}
          >
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
              {loading ? 'Saving...' : 'Next'}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Help Text */}
      <Alert severity="info">
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Important Information
        </Typography>
        <Typography variant="body2">
          • All information must be accurate and verifiable<br />
          • Required documents: Photo (passport-sized), Signature, Birth Certificate<br />
          • Processing time: 5-10 business days<br />
          • You'll be notified via email when your application status changes
        </Typography>
      </Alert>
    </Box>
  );
}
