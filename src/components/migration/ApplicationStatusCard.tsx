'use client';

import { Card, CardContent, Box, Typography, Chip, LinearProgress } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Cancel as CancelIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import type { PassportApplication } from '@/lib/api/migration';

interface ApplicationStatusCardProps {
  application: PassportApplication;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    color: 'default' as const,
    icon: <DocumentIcon />,
    progress: 20,
  },
  SUBMITTED: {
    label: 'Submitted',
    color: 'info' as const,
    icon: <PendingIcon />,
    progress: 40,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    color: 'warning' as const,
    icon: <PendingIcon />,
    progress: 60,
  },
  APPROVED: {
    label: 'Approved',
    color: 'success' as const,
    icon: <CheckCircleIcon />,
    progress: 80,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'error' as const,
    icon: <CancelIcon />,
    progress: 100,
  },
  ISSUED: {
    label: 'Issued',
    color: 'success' as const,
    icon: <CheckCircleIcon />,
    progress: 100,
  },
};

export default function ApplicationStatusCard({ application, onClick }: ApplicationStatusCardProps) {
  const config = STATUS_CONFIG[application.status];

  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          boxShadow: 3,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s',
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {application.passportType} Passport
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Applicant: {application.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Applied: {new Date(application.createdAt).toLocaleDateString()}
            </Typography>
          </Box>

          <Chip
            icon={config.icon}
            label={config.label}
            color={config.color}
            size="small"
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Application Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {config.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={config.progress}
            color={config.color}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Additional Info */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {application.issuedPassportNumber && (
            <Chip
              label={`Passport: ${application.issuedPassportNumber}`}
              size="small"
              variant="outlined"
            />
          )}
          {application.expiresAt && (
            <Chip
              label={`Expires: ${new Date(application.expiresAt).toLocaleDateString()}`}
              size="small"
              variant="outlined"
            />
          )}
          {application.reviewNotes && (
            <Chip
              label="Has Notes"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
