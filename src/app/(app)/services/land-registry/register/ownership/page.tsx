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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stack,
Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Send as SubmitIcon,
  Home as PropertyIcon,
} from '@mui/icons-material';
import { registerPropertyOwnership } from '@/lib/api/land-registry';
import toast from 'react-hot-toast';

const STEPS = ['Land Plot Selection', 'Ownership Details', 'Review & Submit'];

const OWNERSHIP_TYPES = ['FULL', 'PARTIAL', 'JOINT', 'USUFRUCT'];

export default function PropertyOwnershipRegistrationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Mock citizenship check
  const [isCitizen] = useState(true);

  // Form data
  const [landPlotId, setLandPlotId] = useState('');
  const [ownershipType, setOwnershipType] = useState('FULL');
  const [ownershipShare, setOwnershipShare] = useState('100');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionMethod, setAcquisitionMethod] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await registerPropertyOwnership({
        landPlotId,
        ownershipType,
        ownershipShare: parseFloat(ownershipShare),
        acquisitionDate: new Date(acquisitionDate),
        acquisitionMethod,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        notes,
      });
      toast.success('Property ownership registered successfully!');
      router.push('/services/land-registry');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register ownership');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return landPlotId !== '';
      case 1:
        return ownershipType && ownershipShare && acquisitionDate && acquisitionMethod;
      case 2:
        return true;
      default:
        return false;
    }
  };

  if (!isCitizen) {
    return (
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        <Alert severity="error">
          Only citizens can register property ownership. Foreigners may register leases.
        </Alert>
      </Box>
    );
  }

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
          <PropertyIcon sx={{ fontSize: 40, color: 'info.main' }} />
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              Register Property Ownership
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Register your ownership of a land plot or building
            </Typography>
          </Box>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Property ownership registration links you to an existing registered land plot.
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
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Land Plot Selection</Typography>
              <Divider sx={{ mb: 3 }} />
              <TextField
                fullWidth
                label="Land Plot ID or Cadastral Number"
                placeholder="Enter land plot ID"
                value={landPlotId}
                onChange={(e) => setLandPlotId(e.target.value)}
                required
                helperText="The land plot must already be registered in the cadastral system"
              />
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Note:</strong> Land plot lookup and verification will be added in future updates.
              </Alert>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Ownership Details</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Ownership Type</InputLabel>
                  <Select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} label="Ownership Type">
                    {OWNERSHIP_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  type="number"
                  label="Ownership Share (%)"
                  value={ownershipShare}
                  onChange={(e) => setOwnershipShare(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  disabled={ownershipType === 'FULL'}
                />
                <TextField
                  fullWidth
                  type="date"
                  label="Acquisition Date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  fullWidth
                  label="Acquisition Method"
                  placeholder="e.g., Purchase, Inheritance, Gift, Privatization"
                  value={acquisitionMethod}
                  onChange={(e) => setAcquisitionMethod(e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Purchase Price (ALTAN) - Optional"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Stack>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Review Registration</Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Land Plot</Typography>
                  <Typography variant="body1" fontWeight={600}>{landPlotId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ownership Type</Typography>
                  <Chip label={ownershipType} color="primary" size="small" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ownership Share</Typography>
                  <Typography variant="body1">{ownershipShare}%</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Acquisition Details</Typography>
                  <Typography variant="body2">Method: {acquisitionMethod}</Typography>
                  <Typography variant="body2">Date: {new Date(acquisitionDate).toLocaleDateString()}</Typography>
                  {purchasePrice && <Typography variant="body2">Price: {purchasePrice} ALTAN</Typography>}
                </Box>
                {notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{notes}</Typography>
                  </Box>
                )}
                <Alert severity="info">
                  This ownership will be recorded on the ALTAN blockchain and reviewed by a cadastral officer.
                </Alert>
              </Stack>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button onClick={handleBack} disabled={activeStep === 0} startIcon={<PrevIcon />}>Back</Button>
            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                endIcon={submitting ? <CircularProgress size={20} /> : <SubmitIcon />}
              >
                {submitting ? 'Registering...' : 'Submit'}
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
