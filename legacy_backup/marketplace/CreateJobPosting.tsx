/**
 * CreateJobPosting Component
 * 
 * Form for creating/editing job postings:
 * - Job details (title, description, requirements)
 * - Compensation and duration
 * - Location (remote/on-site)
 * - Application deadline
 * - Edit existing postings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useJobMarketplace } from '../../hooks/useJobMarketplace';

export const CreateJobPosting: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { currentJob, loading, error, createJob, getJob, clearError } = useJobMarketplace();

  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [salary, setSalary] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [deadline, setDeadline] = useState('');

  // Load existing job if editing
  useEffect(() => {
    if (id) {
      getJob(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentJob && id) {
      setTitle(currentJob.title);
      setDescription(currentJob.description);
      setRequirements(currentJob.requirements || '');
      setCategoryId(currentJob.categoryId);
      setSalary(currentJob.salary);
      setDuration(currentJob.duration || '');
      setLocation(currentJob.location || '');
      setRemote(currentJob.remote);
      setDeadline(currentJob.deadline ? new Date(currentJob.deadline).toISOString().split('T')[0] : '');
    }
  }, [currentJob, id]);

  const validateForm = (): boolean => {
    return !!(
      title.trim() &&
      description.trim() &&
      salary &&
      parseFloat(salary) > 0 &&
      (remote || location.trim())
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);

    const data = {
      title,
      description,
      requirements: requirements || undefined,
      categoryId,
      salary,
      duration: duration || undefined,
      location: location || undefined,
      remote,
      deadline: deadline || undefined,
    };

    const result = await createJob(data);

    setSaving(false);

    if (result) {
      navigate('/jobs/my-postings');
    }
  };

  if (loading && id) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/jobs')} sx={{ mb: 2 }}>
          Back to Job Board
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {id ? 'Edit Job Posting' : 'Post a Job'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find talented individuals in the ALTAN ecosystem
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            {/* Job Details Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Job Details
              </Typography>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  label="Job Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  fullWidth
                  required
                  placeholder="e.g., Senior Web Developer"
                />

                <TextField
                  label="Job Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  multiline
                  rows={6}
                  fullWidth
                  required
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                />

                <TextField
                  label="Requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="List the skills, experience, and qualifications needed..."
                  helperText="Optional: Specify required skills and qualifications"
                />

                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryId}
                    label="Category"
                    onChange={(e) => setCategoryId(e.target.value as number)}
                  >
                    <MenuItem value={1}>General</MenuItem>
                    <MenuItem value={2}>Technology</MenuItem>
                    <MenuItem value={3}>Design</MenuItem>
                    <MenuItem value={4}>Marketing</MenuItem>
                    <MenuItem value={5}>Business</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Compensation Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Compensation & Duration
              </Typography>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  label="Salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  type="number"
                  fullWidth
                  required
                  InputProps={{
                    endAdornment: <InputAdornment position="end">ALTAN</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Total compensation for this position"
                />

                <TextField
                  label="Duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  fullWidth
                  placeholder="e.g., 3 months, Full-time, Part-time"
                  helperText="Optional: Expected time commitment"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Location Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={remote}
                      onChange={(e) => setRemote(e.target.checked)}
                    />
                  }
                  label="Remote Position"
                />

                {!remote && (
                  <TextField
                    label="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    fullWidth
                    required={!remote}
                    placeholder="e.g., New York, NY"
                  />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Application Settings */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Application Settings
              </Typography>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  label="Application Deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Optional: Last date to accept applications"
                />

                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Posting Tips:
                  </Typography>
                  <Typography variant="body2">
                    • Be clear and specific about job requirements
                    <br />
                    • Set competitive compensation to attract talent
                    <br />
                    • Specify if the position is remote-friendly
                    <br />
                    • Set a reasonable deadline for applications
                  </Typography>
                </Alert>
              </Stack>
            </Box>

            {/* Submit Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/jobs')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={saving ? <CircularProgress size={20} /> : <PublishIcon />}
                disabled={saving || !validateForm()}
              >
                {saving ? 'Publishing...' : 'Publish Job'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};
