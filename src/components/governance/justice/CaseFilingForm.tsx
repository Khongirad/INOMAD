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
import { Gavel, CloudUpload } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface CaseFormData {
  plaintiffSeatId: string;
  defendantSeatId: string;
  description: string;
  rulingType: 'CIVIL' | 'CRIMINAL' | 'ADMINISTRATIVE';
  caseHash: string;
}

const caseTypes = [
  { value: 'CIVIL', label: 'Civil Case', description: 'Disputes between private parties' },
  { value: 'CRIMINAL', label: 'Criminal Case', description: 'Violations of criminal law' },
  { value: 'ADMINISTRATIVE', label: 'Administrative Case', description: 'Government/regulatory disputes' },
];

export const CaseFilingForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<CaseFormData>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const selectedType = watch('rulingType');

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
      
      (document.getElementById('caseHash') as HTMLInputElement).value = hashHex;
    };
    reader.readAsArrayBuffer(file);
  };

  const onSubmit = async (data: CaseFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/justice/cases', {
        ...data,
        filerPrivateKey: process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY || '',
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to file case');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <Card sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Gavel sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Case Filed Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Your case has been filed with the Council of Justice.
            </Typography>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Case ID
              </Typography>
              <Typography variant="h6">
                #{result.caseId}
              </Typography>
              <Chip label="PENDING" color="warning" sx={{ mt: 1 }} />
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              Your case will be assigned to a judge for review. You will be notified when a ruling is made.
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
              File Another Case
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
          <Gavel sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5">File Legal Case</Typography>
            <Typography variant="body2" color="text.secondary">
              Council of Justice
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
          {/* Case Type */}
          <TextField
            fullWidth
            select
            label="Case Type"
            defaultValue=""
            {...register('rulingType', { required: 'Case type is required' })}
            error={!!errors.rulingType}
            helperText={errors.rulingType?.message}
            sx={{ mb: 2 }}
          >
            {caseTypes.map((type) => (
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

          {/* Party Information */}
          <TextField
            fullWidth
            label="Plaintiff Seat ID"
            {...register('plaintiffSeatId', { required: 'Plaintiff seat ID is required' })}
            error={!!errors.plaintiffSeatId}
            helperText={errors.plaintiffSeatId?.message}
            placeholder="seat-..."
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Defendant Seat ID"
            {...register('defendantSeatId', { required: 'Defendant seat ID is required' })}
            error={!!errors.defendantSeatId}
            helperText={errors.defendantSeatId?.message}
            placeholder="seat-..."
            sx={{ mb: 2 }}
          />

          {/* Case Description */}
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Case Description"
            {...register('description', { required: 'Description is required', minLength: 50 })}
            error={!!errors.description}
            helperText={errors.description?.message || 'Minimum 50 characters. Describe the dispute, relevant facts, and legal basis.'}
            placeholder="Provide a detailed description of the case, including relevant facts, evidence, and legal arguments..."
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
              Upload Case Documents
              <input
                type="file"
                hidden
                accept=".pdf"
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
            id="caseHash"
            label="Case Document Hash"
            {...register('caseHash', {
              required: 'Document hash is required',
              pattern: {
                value: /^0x[a-fA-F0-9]{64}$/,
                message: 'Must be a valid 32-byte hash',
              },
            })}
            error={!!errors.caseHash}
            helperText={errors.caseHash?.message || 'SHA-256 hash of case documents'}
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
            {loading ? <CircularProgress size={24} /> : 'File Case'}
          </Button>
        </Box>

        {/* Info */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Filing a case is a serious legal action. Ensure all information is accurate. 
            False claims may result in penalties.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};
