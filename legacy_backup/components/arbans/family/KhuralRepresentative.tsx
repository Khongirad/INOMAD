import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlRadio,
  Radio,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { HowToVote, Warning } from '@mui/icons-material';
import { arbadAPI } from '../../../lib/api/arbad.api';

interface KhuralRepresentativeProps {
  arbadId: number;
  husbandSeatId: number;
  wifeSeatId: number;
  onSuccess?: () => void;
}

export const KhuralRepresentative: React.FC<KhuralRepresentativeProps> = ({
  arbadId,
  husbandSeatId,
  wifeSeatId,
  onSuccess,
}) => {
  const [selectedSeatId, setSelectedSeatId] = useState<number>(husbandSeatId);
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - Number(birthYear) : null;
  const isAgeValid = age !== null && age < 60;
  const ageWarning = age !== null && age >= 60;

  const handleSubmit = async () => {
    if (!isAgeValid) {
      setError('Representative must be under 60 years old');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await arbadAPI.family.setKhuralRep(arbadId, selectedSeatId, Number(birthYear));
      setSuccess(true);
      
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set Khural representative');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Khural representative set successfully!
          </Alert>
          <Typography variant="body1">
            Seat #{selectedSeatId} is now representing Family Arbad #{arbadId} in the Khural.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <HowToVote sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
          <Typography variant="h5" component="h2">
            Set Khural Representative
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          The Khural is the Legislative branch (like US Senate). One representative per Family
          Arbad must be either the husband or wife, and must be under 60 years old.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Representative Selection */}
        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend">Select Representative</FormLabel>
          <RadioGroup
            value={selectedSeatId}
            onChange={(e) => setSelectedSeatId(Number(e.target.value))}
          >
            <FormControlLabel
              value={husbandSeatId}
              control={<Radio />}
              label={`Husband (Seat #${husbandSeatId})`}
            />
            <FormControlLabel
              value={wifeSeatId}
              control={<Radio />}
              label={`Wife (Seat #${wifeSeatId})`}
            />
          </RadioGroup>
        </FormControl>

        {/* Birth Year Input */}
        <TextField
          fullWidth
          label="Birth Year"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          type="number"
          placeholder="e.g., 1985"
          helperText={age !== null ? `Current age: ${age} years` : 'Enter birth year to calculate age'}
          error={ageWarning}
          sx={{ mb: 3 }}
        />

        {/* Age Warning */}
        {ageWarning && (
          <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Age Requirement Not Met:</strong> The representative must be under 60 years
              old. Current age: {age} years.
            </Typography>
          </Alert>
        )}

        {/* Age OK */}
        {isAgeValid && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Age requirement met: {age} years old
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          color="warning"
          size="large"
          onClick={handleSubmit}
          disabled={loading || !birthYear || !isAgeValid}
          startIcon={loading ? <CircularProgress size={20} /> : <HowToVote />}
        >
          {loading ? 'Submitting...' : 'Set Khural Representative'}
        </Button>

        {/* Info Box */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Note:</strong> Once set, the representative can be changed later if needed
            (e.g., if they turn 60 or step down).
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
