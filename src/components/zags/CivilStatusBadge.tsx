'use client';

import { Chip } from '@mui/material';
import {
  Person as SingleIcon,
  Favorite as MarriedIcon,
  HeartBroken as DivorcedIcon,
  Cancel as WidowedIcon,
} from '@mui/icons-material';
import type { CivilStatus } from '@/lib/api/zags';

interface CivilStatusBadgeProps {
  status: CivilStatus;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG = {
  SINGLE: {
    label: 'Single',
    color: 'default' as const,
    icon: <SingleIcon />,
  },
  MARRIED: {
    label: 'Married',
    color: 'success' as const,
    icon: <MarriedIcon />,
  },
  DIVORCED: {
    label: 'Divorced',
    color: 'warning' as const,
    icon: <DivorcedIcon />,
  },
  WIDOWED: {
    label: 'Widowed',
    color: 'error' as const,
    icon: <WidowedIcon />,
  },
};

export default function CivilStatusBadge({ status, size = 'medium' }: CivilStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
    />
  );
}
