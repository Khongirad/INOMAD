import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  FormHelperText,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import {
  useVotingCenter,
  ProposalType,
  KhuralLevel,
  getProposalTypeLabel,
  getLevelLabel,
} from '../../hooks/useVotingCenter';

interface CreateProposalProps {
  open: boolean;
  onClose: () => void;
  defaultLevel?: KhuralLevel;
  defaultKhuralId?: number;
  privateKey: string; // TODO: Get from wallet
}

const VOTING_PERIODS = [
  { label: '1 Day', value: 86400 },
  { label: '3 Days', value: 259200 },
  { label: '1 Week', value: 604800 },
  { label: '2 Weeks', value: 1209600 },
  { label: '1 Month', value: 2592000 },
];

/**
 * @component CreateProposal
 * @description Dialog for creating new proposals
 */
export const CreateProposal: React.FC<CreateProposalProps> = ({
  open,
  onClose,
  defaultLevel = KhuralLevel.ARBAN,
  defaultKhuralId = 1,
  privateKey,
}) => {
  const { createProposal, loading, error } = useVotingCenter();
  const [activeStep, setActiveStep] = useState(0);

  // Form state
  const [proposalType, setProposalType] = useState<ProposalType>(ProposalType.ARBAN_BUDGET);
  const [khuralLevel, setKhuralLevel] = useState<KhuralLevel>(defaultLevel);
  const [khuralId, setKhuralId] = useState<number>(defaultKhuralId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingPeriod, setVotingPeriod] = useState(604800); // 1 week default

  const steps = ['Type & Level', 'Details', 'Review'];

  // Get proposal types for selected level
  const getProposalTypesForLevel = (level: KhuralLevel): ProposalType[] => {
    switch (level) {
      case KhuralLevel.ARBAN:
        return [ProposalType.ARBAN_BUDGET, ProposalType.ARBAN_LEADER, ProposalType.ARBAN_PROJECT];
      case KhuralLevel.ZUN:
        return [ProposalType.ZUN_POLICY, ProposalType.ZUN_ELDER, ProposalType.ZUN_BUDGET];
      case KhuralLevel.MYANGAN:
        return [ProposalType.MYANGAN_LAW, ProposalType.MYANGAN_LEADER];
      case KhuralLevel.TUMEN:
        return [ProposalType.TUMEN_NATIONAL, ProposalType.TUMEN_CHAIRMAN, ProposalType.CONSTITUTIONAL];
      default:
        return [];
    }
  };

  const availableTypes = getProposalTypesForLevel(khuralLevel);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!title || !description) return;

    try {
      await createProposal({
        proposalType,
        khuralLevel,
        khuralId,
        title,
        description,
        votingPeriod,
        privateKey,
      });

      // Reset form
      setActiveStep(0);
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error('Create proposal error:', err);
    }
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return true;
      case 1:
        return title.length >= 10 && description.length >= 50;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold">
          Create New Proposal
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step 1: Type & Level */}
        {activeStep === 0 && (
          <Stack spacing={3}>
            <TextField
              select
              label="Khural Level"
              value={khuralLevel}
              onChange={(e) => {
                const newLevel = Number(e.target.value) as KhuralLevel;
                setKhuralLevel(newLevel);
                // Reset proposal type to first available for new level
                const types = getProposalTypesForLevel(newLevel);
                if (types.length > 0) setProposalType(types[0]);
              }}
              fullWidth
              required
            >
              <MenuItem value={KhuralLevel.ARBAN}>{getLevelLabel(KhuralLevel.ARBAN)}</MenuItem>
              <MenuItem value={KhuralLevel.ZUN}>{getLevelLabel(KhuralLevel.ZUN)}</MenuItem>
              <MenuItem value={KhuralLevel.MYANGAN}>{getLevelLabel(KhuralLevel.MYANGAN)}</MenuItem>
              <MenuItem value={KhuralLevel.TUMEN}>{getLevelLabel(KhuralLevel.TUMEN)}</MenuItem>
            </TextField>

            <TextField
              label="Khural ID"
              type="number"
              value={khuralId}
              onChange={(e) => setKhuralId(Number(e.target.value))}
              fullWidth
              required
              helperText="The specific Arban/Zun/Myangan/Tumen ID"
            />

            <TextField
              select
              label="Proposal Type"
              value={proposalType}
              onChange={(e) => setProposalType(Number(e.target.value) as ProposalType)}
              fullWidth
              required
            >
              {availableTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {getProposalTypeLabel(type)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Voting Period"
              value={votingPeriod}
              onChange={(e) => setVotingPeriod(Number(e.target.value))}
              fullWidth
              required
            >
              {VOTING_PERIODS.map((period) => (
                <MenuItem key={period.value} value={period.value}>
                  {period.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        )}

        {/* Step 2: Details */}
        {activeStep === 1 && (
          <Stack spacing={3}>
            <TextField
              label="Proposal Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
              helperText={`${title.length}/100 characters (min 10)`}
              error={title.length > 0 && title.length < 10}
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={8}
              fullWidth
              required
              helperText={`${description.length}/1000 characters (min 50)`}
              error={description.length > 0 && description.length < 50}
              inputProps={{ maxLength: 1000 }}
            />

            <FormHelperText>
              Provide a clear and detailed description of your proposal. Include context, 
              goals, and expected outcomes.
            </FormHelperText>
          </Stack>
        )}

        {/* Step 3: Review */}
        {activeStep === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Review your proposal before submitting. Once created, it cannot be edited.
            </Alert>

            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Level
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {getLevelLabel(khuralLevel)} #{khuralId}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {getProposalTypeLabel(proposalType)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Voting Period
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {VOTING_PERIODS.find(p => p.value === votingPeriod)?.label}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Title
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {title}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2">
                  {description}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSubmit}
            disabled={loading || !isStepValid()}
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateProposal;
