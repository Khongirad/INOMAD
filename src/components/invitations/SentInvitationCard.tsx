'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle, Clock, Users, Trash2 } from 'lucide-react';

interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  invitedUserId: string;
  invitedUserName?: string;
  role: string;
  status: string;
  message?: string;
  createdAt: string;
}

interface SentInvitationCardProps {
  invitation: Invitation;
  onCancel: (id: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; className: string }> = {
  PENDING: {
    label: 'Pending',
    variant: 'default',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-yellow-600 hover:bg-yellow-700',
  },
  ACCEPTED: {
    label: 'Accepted',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'bg-green-600 hover:bg-green-700',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    className: '',
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'secondary',
    icon: <XCircle className="h-3 w-3" />,
    className: '',
  },
};

export function SentInvitationCard({ invitation, onCancel }: SentInvitationCardProps) {
  const isPending = invitation.status === 'PENDING';
  const config = statusConfig[invitation.status] || statusConfig.PENDING;

  const handleCancel = async () => {
    if (!confirm('Cancel Invitation?')) return;
    await onCancel(invitation.id);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">
                {invitation.invitedUserName || invitation.invitedUserId}
              </h4>
              <p className="text-sm text-muted-foreground">
                in {invitation.organizationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
              {config.icon}
              {config.label}
            </Badge>
            {isPending && (
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                title="Cancel Invitation"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>Role: <strong>{invitation.role}</strong></span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(invitation.createdAt).toLocaleDateString()}
          </p>
        </div>

        {invitation.message && (
          <div className="bg-muted/50 rounded-lg p-3 mt-3">
            <p className="text-sm">{invitation.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
