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
  Chip,
} from '@mui/material';
import { Science, CloudUpload } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface DiscoveryFormData {
  title: string;
  description: string;
  discoveryHash: string;
}

export const DiscoveryRegistration: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<DiscoveryFormData>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      (document.getElementById('discoveryHash') as HTMLInputElement).value = hashHex;
    };
    reader.readAsArrayBuffer(file);
  };

  const onSubmit = async (data: DiscoveryFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/academy/discoveries', {
        ...data,
        submitterSeatId: 'user-seat-id', // TODO: Get from auth context
        submitterPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to register discovery');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Science sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Discovery Registered!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your scientific discovery has been registered.
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Discovery ID
              </Typography>
              <Typography variant="h6">
                #{result.discoveryId}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip label="UNVERIFIED" color="warning" />
                <Chip label="Reviews: 0/2" variant="outlined" />
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              Your discovery requires peer review by 2 ScientistCouncil members. You will be notified when verified.
            </Alert>

            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                setResult(null);
                setUploadedFile(null);
              }}
            >
              Register Another Discovery
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
          <Science sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Register Discovery</Typography>
            <Typography variant="body2" color="text.secondary">
              Academy of Sciences - Peer Review System
            </Typography>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Discovery Title"
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
            placeholder="e.g., Novel Approach to Quantum Entanglement"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={8}
            label="Discovery Description"
            {...register('description', { required: 'Description is required', minLength: 100 })}
            error={!!errors.description}
            helperText={errors.description?.message || 'Minimum 100 characters. Describe your discovery, methodology, and significance.'}
            placeholder="Provide a detailed description of your discovery, including:\n- Background and motivation\n- Methodology\n- Key findings\n- Significance and implications\n- Supporting evidence"
            sx={{ mb: 2 }}
          />

          {/* File Upload */}
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUpload />}
              sx={{ mb: 1 }}
            >
              Upload Discovery Document
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
            </Button>
            {uploadedFile && (
              <Chip
                label={uploadedFile.name}
                onDelete={() => setUploadedFile(null)}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          <TextField
            fullWidth
            id="discoveryHash"
            label="Discovery Document Hash"
            {...register('discoveryHash', {
              required: 'Document hash is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{64}$/,
                message: 'Must be a valid 32-byte hash',
              },
            })}
            error={!!errors.discoveryHash}
            helperText={errors.discoveryHash?.message || 'SHA-256 hash of the discovery document'}
            placeholder="0x..."
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} /> : 'Register Discovery'}
          </Button>
        </Box>

        {/* Info */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Peer Review Process:</strong> Your discovery will be reviewed by at least 2 members 
            of the ScientistCouncil. Once verified with sufficient reviews, it will be permanently archived.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};
