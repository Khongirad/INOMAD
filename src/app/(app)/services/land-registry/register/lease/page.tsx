'use client';

import { useState } from 'react';
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
  Divider,
  Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Send as SubmitIcon,
  Key as LeaseIcon,
} from '@mui/icons-material';
import { registerLease } from '@/lib/api/land-registry';
import toast from 'react-hot-toast';

const STEPS = ['Property Selection', 'Lease Terms', 'Financial Details', 'Review & Submit'];

export default function LeaseRegistrationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [landPlotId, setLandPlotId] = useState('');
  const [lessorName, setLessorName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [currency, setCurrency] = useState('ALTAN');
  const [paymentDay, setPaymentDay] = useState('1');
  const [deposit, setDeposit] = useState('');
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await registerLease({
        landPlotId,
        lessorUserId: lessorName, // In real app, this would be a user ID
        startDate: startDate,
        endDate: endDate,
        monthlyRent: parseFloat(monthlyRent),
        currency,
        paymentDay: parseInt(paymentDay),
        deposit: deposit ? parseFloat(deposit) : undefined,
        terms,
        notes,
      } as any);
      toast.success('Lease registered successfully!');
      router.push('/services/land-registry');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register lease');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return landPlotId && lessorName;
      case 1:
        return startDate && endDate;
      case 2:
        return monthlyRent && paymentDay;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Calculate lease duration
  const calculateDuration = () => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return `${months} months (${Math.floor(months / 12)} years, ${months % 12} months)`;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/land-registry')}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LeaseIcon sx={{ fontSize: 40, color: 'warning.main' }} />
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              Register Lease Agreement
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Available to all users - citizens and foreigners
            </Typography>
          </Box>
        </Box>
      </Box>

      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Lease Registration Open to All
        </Typography>
        <Typography variant="body2">
          Unlike land ownership (citizens only), lease agreements can be registered by anyone,
          including foreign nationals.
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep}>
            {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {/* Step 0: Property Selection */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Property Selection</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Land Plot ID or Cadastral Number"
                  placeholder="Enter the property you're leasing"
                  value={landPlotId}
                  onChange={(e) => setLandPlotId(e.target.value)}
                  required
                  helperText="The property being leased"
                />
                <TextField
                  fullWidth
                  label="Lessor (Property Owner)"
                  placeholder="Name or User ID of the property owner"
                  value={lessorName}
                  onChange={(e) => setLessorName(e.target.value)}
                  required
                  helperText="The person or entity leasing the property to you"
                />
                <Alert severity="info">
                  The lessor will need to approve this lease agreement before it becomes active.
                </Alert>
              </Stack>
            </Box>
          )}

          {/* Step 1: Lease Terms */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Lease Terms</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Lease Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Lease End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  helperText={calculateDuration()}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Lease Terms & Conditions"
                  placeholder="Describe the terms of the lease agreement..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  helperText="E.g., permitted use, maintenance responsibilities, renewal terms, etc."
                />
              </Stack>
            </Box>
          )}

          {/* Step 2: Financial Details */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Financial Details</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Monthly Rent"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                />
                <TextField
                  fullWidth
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="ALTAN"
                  helperText="Default: ALTAN"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Payment Day of Month"
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value)}
                  inputProps={{ min: 1, max: 31 }}
                  required
                  helperText="Day of month when rent is due (1-31)"
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Security Deposit (Optional)"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Amount paid upfront as security"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Additional Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Stack>
            </Box>
          )}

          {/* Step 3: Review */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>Review Lease Agreement</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Property</Typography>
                  <Typography variant="body1" fontWeight={600}>{landPlotId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Lessor (Owner)</Typography>
                  <Typography variant="body1">{lessorName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Lease Period</Typography>
                  <Typography variant="body1">
                    {new Date(startDate).toLocaleDateString()} → {new Date(endDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {calculateDuration()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Financial Terms</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {monthlyRent} {currency}/month
                  </Typography>
                  <Typography variant="body2">Payment due: Day {paymentDay} of each month</Typography>
                  {deposit && <Typography variant="body2">Security Deposit: {deposit} {currency}</Typography>}
                </Box>
                {terms && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Lease Terms</Typography>
                    <Typography variant="body2">{terms}</Typography>
                  </Box>
                )}
                {notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Additional Notes</Typography>
                    <Typography variant="body2">{notes}</Typography>
                  </Box>
                )}
                <Alert severity="warning">
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    ⚠️ Lessor Approval Required
                  </Typography>
                  <Typography variant="body2">
                    This lease agreement will be sent to the property owner for approval. Once approved,
                    it will be recorded on the ALTAN blockchain and become legally binding.
                  </Typography>
                </Alert>
              </Stack>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button onClick={handleBack} disabled={activeStep === 0} startIcon={<PrevIcon />}>Back</Button>
            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="warning"
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                endIcon={submitting ? <CircularProgress size={20} /> : <SubmitIcon />}
              >
                {submitting ? 'Registering...' : 'Submit for Approval'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext} disabled={!canProceed()} endIcon={<NextIcon />}>Next</Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
