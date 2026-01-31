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
import { AccountBalance, CloudUpload } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface RecordFormData {
  title: string;
  recordType: 'LIBRARY' | 'ARCHIVE' | 'CADASTRE';
  metadata: string;
  recordHash: string;
}

const recordTypes = [
  {
    value: 'LIBRARY',
    label: '📚 Library',
    description: 'Scientific publications, research papers, and academic works',
  },
  {
    value: 'ARCHIVE',
    label: '📜 Archive',
    description: 'Historical documents, government records, and legal rulings',
  },
  {
    value: 'CADASTRE',
    label: '🗺️ Cadastre',
    description: 'Land registry, property records, and geographical data',
  },
];

export const RecordSubmission: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RecordFormData>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const selectedType = watch('recordType');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    // Generate document hash
    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      (document.getElementById('recordHash') as HTMLInputElement).value = hashHex;
    };
    reader.readAsArrayBuffer(file);
  };

  const onSubmit = async (data: RecordFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/temple/records', {
        ...data,
        submitterPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit record');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <AccountBalance sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Record Submitted to Temple!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your record has been submitted to the Temple of Heaven.
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Record ID
              </Typography>
              <Typography variant="h6">
                #{result.recordId}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Chip label={result.recordType} color="primary" variant="outlined" />
                <Chip label="UNVERIFIED" color="warning" />
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              Your record will be reviewed by the {selectedType === 'LIBRARY' ? 'ScientistCouncil' : 'WisdomCouncil'} for verification.
              Once verified, it will be permanently archived.
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
              Submit Another Record
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
          <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">Submit Record</Typography>
            <Typography variant="body2" color="text.secondary">
              Temple of Heaven
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
          {/* Record Type */}
          <TextField
            fullWidth
            select
            label="Record Type"
            defaultValue=""
            {...register('recordType', { required: 'Record type is required' })}
            error={!!errors.recordType}
            helperText={errors.recordType?.message}
            sx={{ mb: 2 }}
          >
            {recordTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                <Box>
                  <Typography variant="body1">{type.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {type.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Record Title */}
          <TextField
            fullWidth
            label="Record Title"
            {...register('title', { required: 'Title is required' })}
            error={!!errors.title}
            helperText={errors.title?.message}
            sx={{ mb: 2 }}
          />

          {/* Metadata */}
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Metadata"
            {...register('metadata', { required: 'Metadata is required' })}
            error={!!errors.metadata}
            helperText={errors.metadata?.message || 'Provide detailed metadata: author, date, subject, keywords, etc.'}
            placeholder="Author: ...\nDate: ...\nSubject: ...\nKeywords: ...\nDescription: ..."
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
              Upload Document
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.txt"
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
            id="recordHash"
            label="Document Hash"
            {...register('recordHash', {
              required: 'Document hash is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{64}$/,
                message: 'Must be a valid 32-byte hash',
              },
            })}
            error={!!errors.recordHash}
            helperText={errors.recordHash?.message || 'SHA-256 hash of the document'}
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
            {loading ? <CircularProgress size={24} /> : 'Submit to Temple'}
          </Button>
        </Box>

        {/* Info */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Permanent Archive:</strong> Once verified, your record will be permanently archived 
            in the Temple of Heaven and cannot be modified or deleted.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};
