import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  EmojiEvents,
  TrendingUp,
  Schedule,
  Star,
  SupervisorAccount,
} from '@mui/icons-material';
import { useBankHierarchy } from '../../../hooks/useBankHierarchy';
import { getPositionLabel } from '../../../lib/api/bank-hierarchy.api';

interface PromotionPanelProps {
  employeeId: number;
}

/**
 * @component PromotionPanel
 * @description Check promotion eligibility and request promotions
 * 
 * Features:
 * - Eligibility checker
 * - Requirements checklist
 * - Progress visualization
 * - Promotion request button
 */
export const PromotionPanel: React.FC<PromotionPanelProps> = ({
  employeeId,
}) => {
  const {
    promotionEligibility,
    checkPromotion,
    promoteEmployee,
    loading,
    error,
  } = useBankHierarchy();

  const [promoting, setPromoting] = useState(false);
  const [promotionSuccess, setPromotionSuccess] = useState(false);

  useEffect(() => {
    checkPromotion(employeeId);
  }, [employeeId, checkPromotion]);

  const handlePromote = async () => {
    setPromoting(true);
    try {
      await promoteEmployee(employeeId);
      setPromotionSuccess(true);
    } catch (err) {
      console.error('Promotion failed:', err);
    } finally {
      setPromoting(false);
    }
  };

  if (loading && !promotionEligibility) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (promotionSuccess) {
    return (
      <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
        <EmojiEvents sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Congratulations!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You have been successfully promoted to{' '}
          <strong>{getPositionLabel(promotionEligibility?.nextPosition || 0)}</strong>
        </Typography>
        {promotionEligibility?.newSalary && (
          <Typography variant="h6" color="primary.main">
            New Salary: {parseInt(promotionEligibility.newSalary).toLocaleString()} ALTAN/year
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Promotion Center
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Check your eligibility and request a promotion
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {promotionEligibility && (
        <Box>
          {/* Current Status Card */}
          <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current Position
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {getPositionLabel(promotionEligibility.currentPosition)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Next Position
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {getPositionLabel(promotionEligibility.nextPosition)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {promotionEligibility.newSalary && (
                <Typography variant="body1" color="text.secondary">
                  New Salary: <strong>{parseInt(promotionEligibility.newSalary).toLocaleString()} ALTAN/year</strong>
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Eligibility Status */}
          <Alert
            severity={promotionEligibility.eligible ? 'success' : 'info'}
            sx={{ mb: 3 }}
            icon={promotionEligibility.eligible ? <CheckCircle /> : <Schedule />}
          >
            <Typography variant="body1" fontWeight="bold">
              {promotionEligibility.eligible
                ? '✅ You are eligible for promotion!'
                : '⏳ Keep working - you\'ll be eligible soon'}
            </Typography>
          </Alert>

          {/* Requirements Checklist */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Requirements Checklist
              </Typography>

              <List>
                {/* Min Time */}
                <ListItem>
                  <ListItemIcon>
                    {promotionEligibility.requirements.minTime.met ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Minimum Time in Position"
                    secondary={`${promotionEligibility.requirements.minTime.current} / ${promotionEligibility.requirements.minTime.required} months`}
                  />
                  {promotionEligibility.requirements.minTime.met && (
                    <Chip label="Met" color="success" size="small" />
                  )}
                </ListItem>

                <Divider />

                {/* Min Score */}
                <ListItem>
                  <ListItemIcon>
                    {promotionEligibility.requirements.minScore.met ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Minimum Performance Score"
                    secondary={`${promotionEligibility.requirements.minScore.current} / ${promotionEligibility.requirements.minScore.required}`}
                  />
                  {promotionEligibility.requirements.minScore.met && (
                    <Chip label="Met" color="success" size="small" />
                  )}
                </ListItem>

                <Divider />

                {/* Min Ratings */}
                <ListItem>
                  <ListItemIcon>
                    {promotionEligibility.requirements.minRatings.met ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Minimum Ratings Count"
                    secondary={`${promotionEligibility.requirements.minRatings.current} / ${promotionEligibility.requirements.minRatings.required} ratings`}
                  />
                  {promotionEligibility.requirements.minRatings.met && (
                    <Chip label="Met" color="success" size="small" />
                  )}
                </ListItem>

                <Divider />

                {/* Manager Approval */}
                <ListItem>
                  <ListItemIcon>
                    {promotionEligibility.requirements.managerApproval ? (
                      <CheckCircle color="success" />
                    ) : (
                      <SupervisorAccount color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Manager Approval"
                    secondary={
                      promotionEligibility.requirements.managerApproval
                        ? 'Approved by manager'
                        : 'Requires manager approval'
                    }
                  />
                  {promotionEligibility.requirements.managerApproval && (
                    <Chip label="Approved" color="success" size="small" />
                  )}
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Action Button */}
          {promotionEligibility.eligible ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              onClick={handlePromote}
              disabled={promoting}
              startIcon={promoting ? <CircularProgress size={20} /> : <EmojiEvents />}
              sx={{ py: 2 }}
            >
              {promoting ? 'Processing Promotion...' : 'Request Promotion'}
            </Button>
          ) : (
            <Alert severity="info">
              <Typography variant="body2">
                Complete all requirements to become eligible for promotion. Keep up the good work!
              </Typography>
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default PromotionPanel;
