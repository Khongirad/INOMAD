import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Rating,
  Divider,
} from '@mui/material';
import { TrendingUp, TrendingDown, Star } from '@mui/icons-material';
import { useBankHierarchy } from '../../../hooks/useBankHierarchy';

interface PerformanceTrackerProps {
  employeeId: number;
}

/**
 * @component PerformanceTracker
 * @description Track employee performance metrics
 * 
 * Features:
 * - Performance score display
 * - Rating submission
 * - Recent ratings list
 * - Trend visualization
 * - Peer comparison
 */
export const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({
  employeeId,
}) => {
  const {
    performance,
    fetchPerformance,
    rateEmployee,
    loading,
    error,
  } = useBankHierarchy();

  const [ratingScore, setRatingScore] = useState<number>(75);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPerformance(employeeId);
  }, [employeeId, fetchPerformance]);

  const handleSubmitRating = async () => {
    setSubmitting(true);
    try {
      await rateEmployee(employeeId, ratingScore);
      setRatingScore(75); // Reset
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp color="success" />;
    if (trend < 0) return <TrendingDown color="error" />;
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'success.main';
    if (trend < 0) return 'error.main';
    return 'text.secondary';
  };

  if (loading && !performance) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Performance Tracker
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        View and manage performance metrics for employee #{employeeId}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {performance && (
        <Box>
          {/* Current Performance Card */}
          <Card elevation={3} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Performance Score
              </Typography>

              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Typography variant="h2" fontWeight="bold" color="primary.main">
                  {performance.currentScore}
                </Typography>
                <Typography variant="h4" color="text.secondary">
                  / 100
                </Typography>
                {getTrendIcon(performance.trend)}
                <Typography variant="h6" color={getTrendColor(performance.trend)}>
                  {performance.trend > 0 ? '+' : ''}{performance.trend}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={performance.currentScore}
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />

              <Box display="flex" gap={4} mt={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Ratings Count
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {performance.ratingsCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Department Average
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {performance.departmentAverage}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={
                      performance.currentScore >= performance.departmentAverage
                        ? 'success.main'
                        : 'warning.main'
                    }
                  >
                    {performance.currentScore >= performance.departmentAverage
                      ? 'Above Average'
                      : 'Below Average'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Submit Rating */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Star color="primary" />
                Submit Performance Rating
              </Typography>

              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Rate employee (0-100)
                </Typography>
                <TextField
                  type="number"
                  value={ratingScore}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = parseInt(e.target.value);
                    if (value >= 0 && value <= 100) {
                      setRatingScore(value);
                    }
                  }}
                  inputProps={{ min: 0, max: 100 }}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <Rating
                  value={ratingScore / 20}
                  precision={0.5}
                  onChange={(_, newValue) => {
                    if (newValue !== null) {
                      setRatingScore(newValue * 20);
                    }
                  }}
                  size="large"
                  sx={{ mb: 2 }}
                />

                <Button
                  variant="contained"
                  onClick={handleSubmitRating}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Star />}
                  fullWidth
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Recent Ratings */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Ratings
              </Typography>

              {performance.recentRatings.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No ratings yet
                </Typography>
              ) : (
                <List>
                  {performance.recentRatings.map((rating, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1" fontWeight="bold">
                                Score: {rating.score}/100
                              </Typography>
                              <Rating value={rating.score / 20} readOnly size="small" />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              By Employee #{rating.raterId} • {new Date(rating.ratedAt).toLocaleDateString()}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < performance.recentRatings.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default PerformanceTracker;
