import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { CheckCircle, PersonAdd } from '@mui/icons-material';
import { useBankHierarchy } from '../../../hooks/useBankHierarchy';
import { getPositionLabel, getTierLabel, calculateSalary } from '../../../lib/api/bank-hierarchy.api';

const POSITIONS = [
  { value: 0, label: 'Junior Analyst', description: 'Entry-level analyst position' },
  { value: 1, label: 'Analyst', description: 'Mid-level analyst' },
  { value: 2, label: 'Senior Analyst', description: 'Experienced analyst' },
  { value: 3, label: 'Manager', description: 'Team manager' },
  { value: 4, label: 'Senior Manager', description: 'Department manager' },
  { value: 5, label: 'Executive', description: 'Executive leadership' },
];

interface EmployeeRegisterProps {
  seatId: number; // User's Seat ID
  onSuccess?: () => void;
}

/**
 * @component EmployeeRegister
 * @description Employee registration form for Bank of Siberia
 * 
 * Features:
 * - Department selection
 * - Position selection
 * - Salary preview
 * - Multi-step registration
 */
export const EmployeeRegister: React.FC<EmployeeRegisterProps> = ({
  seatId,
  onSuccess,
}) => {
  const {
    departments,
    fetchDepartments,
    registerEmployee,
    loading,
    error,
  } = useBankHierarchy();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState<number | ''>('');
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [calculatedSalary, setCalculatedSalary] = useState<string>('0');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const steps = ['Select Department', 'Choose Position', 'Review & Confirm'];

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Calculate salary when department or position changes
  useEffect(() => {
    if (selectedDepartment) {
      const dept = departments.find(d => d.id === selectedDepartment);
      if (dept) {
        const salary = calculateSalary(selectedPosition, dept.tier);
        setCalculatedSalary(salary);
      }
    }
  }, [selectedDepartment, selectedPosition, departments]);

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedDepartment) return;

    try {
      await registerEmployee({
        seatId,
        departmentId: selectedDepartment as number,
        position: selectedPosition,
        salary: calculatedSalary,
      });

      setRegistrationSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const selectedDept = departments.find(d => d.id === selectedDepartment);
  const canProceedStep1 = selectedDepartment !== '';
  const canProceedStep2 = true; // Position always valid

  if (registrationSuccess) {
    return (
      <Card elevation={3} sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Welcome to Bank of Siberia!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You have successfully registered as an employee.
          </Typography>
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Your Details
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Department"
                  secondary={selectedDept?.name}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Position"
                  secondary={getPositionLabel(selectedPosition)}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Starting Salary"
                  secondary={`${parseInt(calculatedSalary).toLocaleString()} ALTAN/year`}
                />
              </ListItem>
            </List>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3} sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom fontWeight="bold" display="flex" alignItems="center" gap={1}>
          <PersonAdd />
          Join Bank of Siberia
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Register as an employee and start your banking career
        </Typography>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ my: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Step 1: Select Department */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Department
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose which department you'd like to join. Different tiers have different salary scales.
            </Typography>

            <TextField
              select
              fullWidth
              label="Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(Number(e.target.value))}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  <Box>
                    <Typography variant="body1">
                      {dept.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getTierLabel(dept.tier)} • {dept.employeeCount} employees
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {selectedDept && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{selectedDept.name}</strong> is a {getTierLabel(selectedDept.tier)} department
                  {selectedDept.managerId && ` with ${selectedDept.employeeCount} employees`}.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: Choose Position */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Starting Position
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Select your entry position. Higher positions require experience and qualifications.
            </Typography>

            <TextField
              select
              fullWidth
              label="Position"
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(Number(e.target.value))}
              sx={{ mb: 2 }}
            >
              {POSITIONS.map((pos) => (
                <MenuItem key={pos.value} value={pos.value}>
                  <Box>
                    <Typography variant="body1">{pos.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pos.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Salary Preview:</strong> {parseInt(calculatedSalary).toLocaleString()} ALTAN/year
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Step 3: Review & Confirm */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Registration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please review your details before confirming registration.
            </Typography>

            <List>
              <ListItem>
                <ListItemText
                  primary="Seat ID"
                  secondary={seatId}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Department"
                  secondary={
                    <Box display="flex" alignItems="center" gap={1}>
                      {selectedDept?.name}
                      <Chip label={getTierLabel(selectedDept?.tier || 0)} size="small" />
                    </Box>
                  }
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Position"
                  secondary={getPositionLabel(selectedPosition)}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Starting Salary"
                  secondary={
                    <Typography variant="h6" color="primary.main">
                      {parseInt(calculatedSalary).toLocaleString()} ALTAN/year
                    </Typography>
                  }
                />
              </ListItem>
            </List>

            <Alert severity="warning" sx={{ mt: 2 }}>
              Once registered, you'll need manager approval for promotions and transfers.
            </Alert>
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0 || loading}
          >
            Back
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !canProceedStep1) ||
                loading
              }
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
            >
              {loading ? 'Registering...' : 'Confirm Registration'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default EmployeeRegister;
