'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as UploadIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { uploadPassportDocument, getPassportDocuments, type Document } from '@/lib/api/migration';
import { toast } from 'react-hot-toast';

interface PassportApplicationFormProps {
  step: number;
  formData: any;
  onChange: (data: any) => void;
  applicationId: string | null;
}

export default function PassportApplicationForm({
  step,
  formData,
  onChange,
  applicationId,
}: PassportApplicationFormProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  const handleFileUpload = async (type: 'PHOTO' | 'SIGNATURE' | 'BIRTH_CERTIFICATE', file: File) => {
    if (!applicationId) {
      toast.error('Application not created yet');
      return;
    }

    try {
      setUploading(true);
      const doc = await uploadPassportDocument(applicationId, file, type);
      setDocuments((prev) => [...prev, doc]);
      toast.success('Document uploaded successfully (encrypted)');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Step 0: Personal Information
  if (step === 0) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Personal Information
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your basic personal details as they appear on your birth certificate
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            helperText="As it appears on birth certificate"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            type="date"
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Sex"
            value={formData.sex}
            onChange={(e) => handleChange('sex', e.target.value)}
          >
            <MenuItem value="M">Male</MenuItem>
            <MenuItem value="F">Female</MenuItem>
            <MenuItem value="O">Other</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Nationality"
            value={formData.nationality}
            onChange={(e) => handleChange('nationality', e.target.value)}
            disabled
            helperText="Citizens only can apply"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="number"
            label="Height (cm)"
            value={formData.height || ''}
            onChange={(e) => handleChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Eye Color"
            value={formData.eyeColor}
            onChange={(e) => handleChange('eyeColor', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Previous Passport Number"
            value={formData.previousPassportNumber}
            onChange={(e) => handleChange('previousPassportNumber', e.target.value)}
            helperText="If renewing"
          />
        </Grid>
      </Grid>
    );
  }

  // Step 1: Biographical Data
  if (step === 1) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Biographical Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Additional information for passport records
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Place of Birth"
            value={formData.placeOfBirth}
            onChange={(e) => handleChange('placeOfBirth', e.target.value)}
            helperText="City, Region"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Father's Name"
            value={formData.fatherName}
            onChange={(e) => handleChange('fatherName', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Mother's Name"
            value={formData.motherName}
            onChange={(e) => handleChange('motherName', e.target.value)}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Current Address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            multiline
            rows={2}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            required
            label="City"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            required
            label="Region"
            value={formData.region}
            onChange={(e) => handleChange('region', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Postal Code"
            value={formData.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value)}
          />
        </Grid>
      </Grid>
    );
  }

  // Step 2: Document Upload
  if (step === 2) {
    const hasPhoto = documents.some((d) => d.type === 'PHOTO');
    const hasSignature = documents.some((d) => d.type === 'SIGNATURE');
    const hasBirthCert = documents.some((d) => d.type === 'BIRTH_CERTIFICATE');

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Document Upload
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload required documents. All files are encrypted with AES-256-GCM
        </Typography>

        <Grid container spacing={3}>
          {/* Photo */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Passport Photo {hasPhoto && <CheckIcon color="success" fontSize="small" />}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Recent color photo, 600x600px min
                </Typography>
                <Button
                  variant={hasPhoto ? 'outlined' : 'contained'}
                  component="label"
                  fullWidth
                  startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={uploading}
                  sx={{ mt: 2 }}
                >
                  {hasPhoto ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('PHOTO', file);
                    }}
                  />
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Signature */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Signature {hasSignature && <CheckIcon color="success" fontSize="small" />}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Scan or photo of your signature
                </Typography>
                <Button
                  variant={hasSignature ? 'outlined' : 'contained'}
                  component="label"
                  fullWidth
                  startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={uploading}
                  sx={{ mt: 2 }}
                >
                  {hasSignature ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('SIGNATURE', file);
                    }}
                  />
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Birth Certificate */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Birth Certificate {hasBirthCert && <CheckIcon color="success" fontSize="small" />}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Scan of original certificate
                </Typography>
                <Button
                  variant={hasBirthCert ? 'outlined' : 'contained'}
                  component="label"
                  fullWidth
                  startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                  disabled={uploading}
                  sx={{ mt: 2 }}
                >
                  {hasBirthCert ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('BIRTH_CERTIFICATE', file);
                    }}
                  />
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {!hasPhoto || !hasSignature || !hasBirthCert ? (
          <Alert severity="warning" sx={{ mt: 3 }}>
            Please upload all required documents to proceed
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mt: 3 }}>
            All required documents uploaded successfully
          </Alert>
        )}
      </Box>
    );
  }

  // Step 3: Review & Confirm
  if (step === 3) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Review & Confirm
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please review all information before submitting
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">{formData.fullName}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Date of Birth
                </Typography>
                <Typography variant="body1">{formData.dateOfBirth}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Place of Birth
                </Typography>
                <Typography variant="body1">{formData.placeOfBirth}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Nationality
                </Typography>
                <Typography variant="body1">{formData.nationality}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1">
                  {formData.address}, {formData.city}, {formData.region}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Documents Uploaded
                </Typography>
                <Typography variant="body2">
                  ✅ Passport Photo<br />
                  ✅ Signature<br />
                  ✅ Birth Certificate<br />
                  <Typography variant="caption" color="text.secondary">
                    (All documents encrypted)
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 3 }}>
          By submitting this application, you confirm that all information provided is accurate and truthful.
          False information may result in application rejection or legal consequences.
        </Alert>
      </Box>
    );
  }

  return null;
}
