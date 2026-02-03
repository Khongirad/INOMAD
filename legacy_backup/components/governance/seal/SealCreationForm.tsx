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
import { GavelOutlined } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { ethers } from 'ethers';

interface SealFormData {
  title: string;
  description: string;
  signer1Address: string;
  signer2Address: string;
  documentHash: string;
}

const steps = ['Seal Details', 'Signers', 'Document', 'Confirm'];

export const SealCreationForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<SealFormData>();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const formData = watch();

  const onSubmit = async (data: SealFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Validate Ethereum addresses
      if (!ethers.isAddress(data.signer1Address) || !ethers.isAddress(data.signer2Address)) {
        throw new Error('Invalid Ethereum address');
      }

      // Call backend API
      const response = await axios.post('/api/digital-seal', {
        ...data,
        // TODO: Get private key from wallet integration
        signerPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setResult(response.data);
      setActiveStep(steps.length);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create seal');
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              fullWidth
              label="Seal Title"
              {...register('title', { required: 'Title is required' })}
              error={!!errors.title}
              helperText={errors.title?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              {...register('description', { required: 'Description is required' })}
              error={!!errors.description}
              helperText={errors.description?.message}
              placeholder="Describe the purpose of this multisig contract..."
            />
          </>
        );

      case 1:
        return (
          <>
            <TextField
              fullWidth
              label="Signer 1 Address"
              {...register('signer1Address', {
                required: 'Signer 1 address is required',
                validate: (value) => ethers.isAddress(value) || 'Invalid Ethereum address',
              })}
              error={!!errors.signer1Address}
              helperText={errors.signer1Address?.message}
              placeholder="0x..."
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Signer 2 Address"
              {...register('signer2Address', {
                required: 'Signer 2 address is required',
                validate: (value) => ethers.isAddress(value) || 'Invalid Ethereum address',
              })}
              error={!!errors.signer2Address}
              helperText={errors.signer2Address?.message}
              placeholder="0x..."
            />
          </>
        );

      case 2:
        return (
          <TextField
            fullWidth
            label="Document Hash"
            {...register('documentHash', {
              required: 'Document hash is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{64}$/,
                message: 'Must be a valid 32-byte hash (0x...)',
              },
            })}
            error={!!errors.documentHash}
            helperText={errors.documentHash?.message || 'SHA-256 hash of the document (0x...)'}
            placeholder="0x..."
          />
        );

      case 3:
        return (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Review Seal Details
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Title
              </Typography>
              <Typography variant="body1">{formData.title}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1">{formData.description}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Signer 1
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {formData.signer1Address}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Signer 2
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {formData.signer2Address}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Document Hash
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                {formData.documentHash}
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (result) {
    return (
      <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <GavelOutlined sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Digital Seal Created!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your 2-of-2 multisig contract has been created successfully.
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Seal ID
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                {result.id}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              Both signers must approve before this seal can be executed.
            </Alert>

            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                setResult(null);
                setActiveStep(0);
              }}
            >
              Create Another Seal
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <GavelOutlined sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Create Digital Seal</Typography>
            <Typography variant="body2" color="text.secondary">
              2-of-2 Multisig Contract
            </Typography>
          </Box>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent(activeStep)}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
              fullWidth
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Seal'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                variant="contained"
                fullWidth
              >
                Next
              </Button>
            )}
          </Box>
        </Box>

        {/* Info */}
        <Alert severity="info" sx={{ mt: 3 }}>
          This will create a 2-of-2 multisig contract requiring both signers to approve before execution.
        </Alert>
      </CardContent>
    </Card>
  );
};
