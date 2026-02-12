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
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Send as SubmitIcon,
  Landscape as LandIcon,
} from '@mui/icons-material';
import { registerLandPlot, type LandPlot } from '@/lib/api/land-registry';
import toast from 'react-hot-toast';

const STEPS = ['Basic Info', 'Location & Size', 'Ownership Details', 'Review & Submit'];

const LAND_USE_TYPES = [
  'AGRICULTURAL',
  'RESIDENTIAL',
  'COMMERCIAL',
  'INDUSTRIAL', 'FOREST',
  'RECREATIONAL',
  'CONSERVATION',
  'MIXED_USE',
];

export default function LandRegistrationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Mock citizenship check (should come from auth context)
  const [isCitizen, setIsCitizen] = useState(true);

  // Form data
  const [cadastralNumber, setCadastralNumber] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [landUseType, setLandUseType] = useState('');
  const [area, setArea] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [boundaries, setBoundaries] = useState('');  
  const [ownershipType, setOwnershipType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [ownershipShare, setOwnershipShare] = useState('100');
  const [documents, setDocuments] = useState('');

  useEffect(() => {
    // Check citizenship
    // In real app, this would come from auth context
    const checkCitizenship = async () => {
      // Mock check
      setIsCitizen(true);
    };
    checkCitizenship();
  }, []);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      await registerLandPlot({
        cadastralNumber,
        address,
        region,
        landUseType,
        area: parseFloat(area),
        coordinates,
        boundaries,
      } as any);

      toast.success('Land plot registered successfully!');
      router.push('/services/land-registry');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register land plot');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return cadastralNumber && address && region && landUseType;
      case 1:
        return area && coordinates;
      case 2:
        return ownershipType && ownershipShare;
      case 3:
        return true;
      default:
        return false;
    }
  };

  if (!isCitizen) {
    return (
      <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/land-registry')}
          sx={{ mb: 2 }}
        >
          Back to Land Registry
        </Button>
        <Alert severity="error">
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Citizenship Required
          </Typography>
          <Typography variant="body2">
            Only citizens of the Siberian Confederation can register land ownership. Foreigners may
            register lease agreements instead.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/land-registry')}
          sx={{ mb: 2 }}
        >
          Back to Land Registry
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LandIcon sx={{ fontSize: 40, color: 'success.main' }} />
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              Register Land Plot
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Register a new land plot in the cadastral registry
            </Typography>
          </Box>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Citizens Only
        </Typography>
        <Typography variant="body2">
          Land ownership is restricted to citizens of the Siberian Confederation. All registrations
          are recorded on the ALTAN blockchain for permanent, immutable records.
        </Typography>
      </Alert>

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
          {/* Step 0: Basic Info */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Cadastral Number"
                  placeholder="e.g., 54:35:123456:78"
                  value={cadastralNumber}
                  onChange={(e) => setCadastralNumber(e.target.value)}
                  required
                  helperText="Unique identification number for this land plot"
                />
                <TextField
                  fullWidth
                  label="Address"
                  placeholder="Street address or location description"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
                <TextField
                  fullWidth
                  label="Region"
                  placeholder="e.g., Irkutsk Oblast, Buryatia"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  required
                />
                <FormControl fullWidth required>
                  <InputLabel>Land Use Type</InputLabel>
                  <Select
                    value={landUseType}
                    onChange={(e) => setLandUseType(e.target.value)}
                    label="Land Use Type"
                  >
                    {LAND_USE_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
          )}

          {/* Step 1: Location & Size */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Location & Size
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Area (hectares)"
                  placeholder="e.g., 2.5"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                  helperText="Total area in hectares"
                  inputProps={{ step: '0.01', min: '0' }}
                />
                <TextField
                  fullWidth
                  label="GPS Coordinates"
                  placeholder="e.g., 52.2897° N, 104.2806° E"
                  value={coordinates}
                  onChange={(e) => setCoordinates(e.target.value)}
                  required
                  helperText="Central point or corner coordinates"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Boundary Description (Optional)"
                  placeholder="Describe the boundaries of the land plot..."
                  value={boundaries}
                  onChange={(e) => setBoundaries(e.target.value)}
                  helperText="E.g., 'Bounded by Main Road to the north, River to the south'"
                />
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>GIS Integration Coming Soon:</strong> Interactive map for selecting
                    boundaries with polygon drawing tools will be available in the next update.
                  </Typography>
                </Alert>
              </Stack>
            </Box>
          )}

          {/* Step 2: Ownership Details */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Ownership Details
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Ownership Type</InputLabel>
                  <Select
                    value={ownershipType}
                    onChange={(e) => setOwnershipType(e.target.value as 'FULL' | 'PARTIAL')}
                    label="Ownership Type"
                  >
                    <MenuItem value="FULL">Full Ownership (100%)</MenuItem>
                    <MenuItem value="PARTIAL">Partial/Shared Ownership</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  type="number"
                  label="Ownership Share (%)"
                  value={ownershipShare}
                  onChange={(e) => setOwnershipShare(e.target.value)}
                  disabled={ownershipType === 'FULL'}
                  inputProps={{ min: '0', max: '100', step: '0.01' }}
                  helperText={
                    ownershipType === 'FULL'
                      ? 'Full ownership = 100%'
                      : 'Enter your percentage share (e.g., 50 for 50%)'
                  }
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Supporting Documents (Optional)"
                  placeholder="List any supporting documents (will be uploaded separately)..."
                  value={documents}
                  onChange={(e) => setDocuments(e.target.value)}
                  helperText="E.g., previous deeds, survey reports, tax records"
                />
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>Note:</strong> Land registration will be reviewed by a cadastral officer
                    before finalization. You may be required to provide additional documentation.
                  </Typography>
                </Alert>
              </Stack>
            </Box>
          )}

          {/* Step 3: Review */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Review Your Registration
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cadastral Number
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {cadastralNumber}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Address & Region
                  </Typography>
                  <Typography variant="body1">{address}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {region}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Land Use Type
                  </Typography>
                  <Chip label={landUseType.replace(/_/g, ' ')} color="primary" size="small" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Area & Location
                  </Typography>
                  <Typography variant="body1">{area} hectares</Typography>
                  <Typography variant="body2" color="text.secondary">
                    GPS: {coordinates}
                  </Typography>
                </Box>
                {boundaries && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Boundaries
                    </Typography>
                    <Typography variant="body2">{boundaries}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ownership
                  </Typography>
                  <Typography variant="body1">
                    {ownershipType === 'FULL' ? 'Full Ownership' : `Partial Ownership (${ownershipShare}%)`}
                  </Typography>
                </Box>
                {documents && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Supporting Documents
                    </Typography>
                    <Typography variant="body2">{documents}</Typography>
                  </Box>
                )}
                <Alert severity="info">
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Final Confirmation
                  </Typography>
                  <Typography variant="body2">
                    By submitting this registration, you confirm that:
                  </Typography>
                  <ul>
                    <li>All information provided is accurate and truthful</li>
                    <li>You have legal rights to this land plot</li>
                    <li>This registration will be reviewed by a cadastral officer</li>
                    <li>The record will be permanently registered on the ALTAN blockchain</li>
                  </ul>
                </Alert>
              </Stack>
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button onClick={handleBack} disabled={activeStep === 0} startIcon={<PrevIcon />}>
              Back
            </Button>
            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="success"
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                endIcon={submitting ? <CircularProgress size={20} /> : <SubmitIcon />}
              >
                {submitting ? 'Registering...' : 'Submit Registration'}
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
    </Box>
  );
}
