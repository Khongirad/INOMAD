'use client';

import { Badge } from '@/components/ui/badge';
import { Heart, HeartCrack, User, XCircle } from 'lucide-react';
import type { CivilStatus } from '@/lib/api/zags';

interface CivilStatusBadgeProps {
  status: CivilStatus;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; className: string }> = {
  SINGLE: {
    label: 'Single',
    variant: 'secondary',
    icon: <User className="h-3.5 w-3.5" />,
    className: '',
  },
  MARRIED: {
    label: 'Married',
    variant: 'default',
    icon: <Heart className="h-3.5 w-3.5" />,
    className: 'bg-green-600 hover:bg-green-700',
  },
  DIVORCED: {
    label: 'Divorced',
    variant: 'default',
    icon: <HeartCrack className="h-3.5 w-3.5" />,
    className: 'bg-yellow-600 hover:bg-yellow-700',
  },
  WIDOWED: {
    label: 'Widowed',
    variant: 'destructive',
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: '',
  },
};

export default function CivilStatusBadge({ status, size = 'medium' }: CivilStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.SINGLE;

  return (
    <Badge
      variant={config.variant}
      className={`gap-1 ${size === 'small' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'} ${config.className}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
