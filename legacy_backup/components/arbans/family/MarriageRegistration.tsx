import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Favorite } from '@mui/icons-material';
import { arbadAPI } from '../../lib/api/arbad.api';

interface MarriageRegistrationProps {
  onSuccess?: (arbadId: number) => void;
}

const steps = ['Enter Details', 'Verify', 'Submit'];

export const MarriageRegistration: React.FC<MarriageRegistrationProps> = ({ onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [husbandSeatId, setHusbandSeatId] = useState('');
  const [wifeSeatId, setWifeSeatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ arbadId: number; txHash: string } | null>(null);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await arbadAPI.family.registerMarriage({
        husbandSeatId: Number(husbandSeatId),
        wifeSeatId: Number(wifeSeatId),
      });

      setSuccess(response.data);
      setActiveStep(3); // Success step
      
      if (onSuccess) {
        onSuccess(response.data.arbadId);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register marriage');
    } finally {
      setLoading(false);
    }
  };

  const isValidSeatId = (id: string) => {
    return /^\d+$/.test(id) && Number(id) > 0;
  };

  const canProceed = () => {
    if (activeStep === 0) {
      return isValidSeatId(husbandSeatId) && isValidSeatId(wifeSeatId);
    }
    return true;
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Favorite sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
          <Typography variant="h4" component="h1">
            Register Marriage
          </Typography>
        </Box>

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

        {activeStep === 0 && (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Enter the Seat IDs of both parties. Both must be verified citizens and not currently married.
            </Typography>

            <TextField
              fullWidth
              label="Husband Seat ID"
              value={husbandSeatId}
              onChange={(e) => setHusbandSeatId(e.target.value)}
              type="number"
              placeholder="Enter seat ID"
              error={husbandSeatId !== '' && !isValidSeatId(husbandSeatId)}
              helperText={
                husbandSeatId !== '' && !isValidSeatId(husbandSeatId)
                  ? 'Please enter a valid seat ID'
                  : ''
              }
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Wife Seat ID"
              value={wifeSeatId}
              onChange={(e) => setWifeSeatId(e.target.value)}
              type="number"
              placeholder="Enter seat ID"
              error={wifeSeatId !== '' && !isValidSeatId(wifeSeatId)}
              helperText={
                wifeSeatId !== '' && !isValidSeatId(wifeSeatId)
                  ? 'Please enter a valid seat ID'
                  : ''
              }
              sx={{ mb: 2 }}
            />
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Verify Details
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please verify that the information is correct before submitting the transaction.
            </Alert>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Husband Seat ID:</strong> {husbandSeatId}
              </Typography>
              <Typography variant="body1">
                <strong>Wife Seat ID:</strong> {wifeSeatId}
              </Typography>
            </Box>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {loading ? (
              <>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6">Submitting Transaction...</Typography>
                <Typography variant="body2" color="text.secondary">
                  Please wait while we register your marriage on the blockchain
                </Typography>
              </>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                startIcon={<Favorite />}
              >
                Register Marriage
              </Button>
            )}
          </Box>
        )}

        {activeStep === 3 && success && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Marriage registered successfully!
            </Alert>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Family Arbad Created
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Arbad ID:</strong> {success.arbadId}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ wordBreak: 'break-all' }}
              >
                <strong>Transaction Hash:</strong> {success.txHash}
              </Typography>
            </Box>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Register Another Marriage
            </Button>
          </Box>
        )}

        {activeStep < 2 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
