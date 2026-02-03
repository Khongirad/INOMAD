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
  MenuItem,
  Chip,
} from '@mui/material';
import { Science, CloudUpload } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface PatentFormData {
  title: string;
  field: string;
  description: string;
  patentHash: string;
}

const scientificFields = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'Engineering',
  'Medicine',
  'Environmental Science',
  'Materials Science',
  'Other',
];

export const PatentSubmissionForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<PatentFormData>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    // TODO: Upload to IPFS and get hash
    // For now, generate a mock hash
    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Set the hash in the form
      (document.getElementById('patentHash') as HTMLInputElement).value = hashHex;
    };
    reader.readAsArrayBuffer(file);
  };

  const onSubmit = async (data: PatentFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Call backend API
      const response = await axios.post('/api/academy/patents', {
        ...data,
        submitterSeatId: 'user-seat-id', // TODO: Get from auth context
        submitterPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit patent');
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
              Patent Submitted!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your patent application has been submitted to the Academy of Sciences.
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Patent ID
              </Typography>
              <Typography variant="h6">
                #{result.patentId}
              </Typography>
              <Chip label="PENDING" color="warning" sx={{ mt: 1 }} />
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              Your patent will be reviewed by a member of the ScientistCouncil. You will be notified of the decision.
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
              Submit Another Patent
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
            <Typography variant="h5">Submit Patent</Typography>
            <Typography variant="body2" color="text.secondary">
              Academy of Sciences
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
            label="Patent Title"
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            select
            label="Scientific Field"
            defaultValue=""
            {...register('field', { required: 'Field is required' })}
            error={!!errors.field}
            helperText={errors.field?.message}
            sx={{ mb: 2 }}
          >
            {scientificFields.map((field) => (
              <MenuItem key={field} value={field}>
                {field}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={6}
            label="Patent Description"
            {...register('description', { required: 'Description is required' })}
            error={!!errors.description}
            helperText={errors.description?.message}
            placeholder="Describe your invention, its novelty, and potential applications..."
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
              Upload Patent Document
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
            id="patentHash"
            label="Patent Document Hash"
            {...register('patentHash', {
              required: 'Document hash is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{64}$/,
                message: 'Must be a valid 32-byte hash',
              },
            })}
            error={!!errors.patentHash}
            helperText={errors.patentHash?.message || 'SHA-256 hash of the patent document'}
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
            {loading ? <CircularProgress size={24} /> : 'Submit Patent'}
          </Button>
        </Box>

        {/* Info */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Review Process:</strong> Your patent will be reviewed by a ScientistCouncil member. 
            Once approved, it will be permanently archived in the Temple of Heaven Library.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};
