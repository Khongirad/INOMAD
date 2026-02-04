'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
} from '@mui/material';
import {
  HeartBroken as DivorceIcon,
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Send as SubmitIcon,
} from '@mui/icons-material';
import { getMyMarriages, fileDivorce, type Marriage } from '@/lib/api/zags';
import toast from 'react-hot-toast';

const STEPS = ['Select Marriage', 'Divorce Details', 'Property Division', 'Review & Submit'];

export default function DivorceApplicationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [marriages, setMarriages] = useState<Marriage[]>([]);

  // Form data
  const [selectedMarriageId, setSelectedMarriageId] = useState('');
  const [reason, setReason] = useState('');
  const [propertyDivision, setPropertyDivision] = useState('');

  useEffect(() => {
    loadMarriages();
  }, []);

  const loadMarriages = async () => {
    try {
      setLoading(true);
      const data = await getMyMarriages();
      // Filter only registered marriages
      const registered = data.filter((m) => m.status === 'REGISTERED');
      setMarriages(registered);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load marriages');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await fileDivorce({
        marriageId: selectedMarriageId,
        reason,
        propertyDivision: propertyDivision || undefined,
      });
      toast.success('Divorce application filed successfully');
      router.push('/services/zags');
    } catch (err: any) {
      toast.error(err.message || 'Failed to file divorce');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMarriage = marriages.find((m) => m.id === selectedMarriageId);

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return selectedMarriageId !== '';
      case 1:
        return reason.trim().length > 0;
      case 2:
        return true; // Property division is optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/zags')}
          sx={{ mb: 2 }}
        >
          Back to ZAGS
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DivorceIcon sx={{ fontSize: 40, color: 'error.main' }} />
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              File for Divorce
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Submit your divorce application
            </Typography>
          </Box>
        </Box>
      </Box>

      {marriages.length === 0 ? (
        <Alert severity="info">
          You have no registered marriages. Only registered marriages can be dissolved.
        </Alert>
      ) : (
        <>
          {/* Stepper */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stepper activeStep={activeStep}>
                {STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>

          {/* Form Content */}
          <Card>
            <CardContent>
              {/* Step 0: Select Marriage */}
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Select Marriage to Dissolve
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <FormControl fullWidth>
                    <InputLabel>Marriage</InputLabel>
                    <Select
                      value={selectedMarriageId}
                      onChange={(e) => setSelectedMarriageId(e.target.value)}
                      label="Marriage"
                    >
                      {marriages.map((marriage) => (
                        <MenuItem key={marriage.id} value={marriage.id}>
                          {marriage.spouse1FullName} & {marriage.spouse2FullName} - Married on{' '}
                          {new Date(marriage.marriageDate).toLocaleDateString()} (Certificate:{' '}
                          {marriage.certificateNumber})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedMarriage && (
                    <Alert severity="info" sx={{ mt: 3 }}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        Selected Marriage Details
                      </Typography>
                      <Typography variant="body2">
                        <strong>Spouses:</strong> {selectedMarriage.spouse1FullName} &{' '}
                        {selectedMarriage.spouse2FullName}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Marriage Date:</strong>{' '}
                        {new Date(selectedMarriage.marriageDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Property Regime:</strong> {selectedMarriage.propertyRegime || 'N/A'}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Step 1: Divorce Details */}
              {activeStep === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Divorce Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Reason for Divorce"
                    placeholder="Please provide detailed reasons for filing divorce..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    helperText="This information will be reviewed by ZAGS officers"
                  />
                  <Alert severity="warning" sx={{ mt: 3 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Important Notice
                    </Typography>
                    <Typography variant="body2">
                      Filing for divorce is a serious legal action. Your spouse will be notified of
                      this application. The ZAGS officer will review and may require additional
                      documentation.
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Step 2: Property Division */}
              {activeStep === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Property Division (Optional)
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  {selectedMarriage?.propertyRegime && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Current Property Regime:</strong> {selectedMarriage.propertyRegime}
                      </Typography>
                      {selectedMarriage.propertyAgreement && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Agreement:</strong> {selectedMarriage.propertyAgreement}
                        </Typography>
                      )}
                    </Alert>
                  )}
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Proposed Property Division"
                    placeholder="Describe how you propose to divide jointly owned property, assets, and debts..."
                    value={propertyDivision}
                    onChange={(e) => setPropertyDivision(e.target.value)}
                    helperText="Optional: You can propose how property should be divided, or leave this to be determined during the divorce process"
                  />
                </Box>
              )}

              {/* Step 3: Review */}
              {activeStep === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Review Your Application
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Marriage to Dissolve
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedMarriage?.spouse1FullName} & {selectedMarriage?.spouse2FullName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Certificate: {selectedMarriage?.certificateNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Married: {selectedMarriage && new Date(selectedMarriage.marriageDate).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Reason for Divorce
                      </Typography>
                      <Typography variant="body2">{reason}</Typography>
                    </Box>

                    {propertyDivision && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Proposed Property Division
                        </Typography>
                        <Typography variant="body2">{propertyDivision}</Typography>
                      </Box>
                    )}

                    <Alert severity="error">
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        ⚠️ Final Confirmation
                      </Typography>
                      <Typography variant="body2">
                        By submitting this application, you confirm that:
                      </Typography>
                      <ul>
                        <li>All information provided is true and accurate</li>
                        <li>You understand this will initiate formal divorce proceedings</li>
                        <li>Your spouse will be officially notified</li>
                        <li>This action cannot be easily reversed</li>
                      </ul>
                    </Alert>
                  </Stack>
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  startIcon={<PrevIcon />}
                >
                  Back
                </Button>
                {activeStep === STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleSubmit}
                    disabled={!canProceed() || submitting}
                    endIcon={submitting ? <CircularProgress size={20} /> : <SubmitIcon />}
                  >
                    {submitting ? 'Filing...' : 'File Divorce Application'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!canProceed()}
                    endIcon={<NextIcon />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
