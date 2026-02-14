'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle, Clock, Users, MessageSquare } from 'lucide-react';

interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  invitedByName?: string;
  role: string;
  status: string;
  message?: string;
  createdAt: string;
}

interface ReceivedInvitationCardProps {
  invitation: Invitation;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; className: string }> = {
  PENDING: {
    label: 'Ожидает',
    variant: 'default',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-yellow-600 hover:bg-yellow-700',
  },
  ACCEPTED: {
    label: 'Принято',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'bg-green-600 hover:bg-green-700',
  },
  REJECTED: {
    label: 'Отклонено',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    className: '',
  },
};

export function ReceivedInvitationCard({
  invitation,
  onAccept,
  onReject,
}: ReceivedInvitationCardProps) {
  const isPending = invitation.status === 'PENDING';
  const config = statusConfig[invitation.status] || statusConfig.PENDING;

  const handleAccept = async () => {
    await onAccept(invitation.id);
  };

  const handleReject = async () => {
    await onReject(invitation.id);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">{invitation.organizationName}</h4>
              {invitation.invitedByName && (
                <p className="text-sm text-muted-foreground">
                  от {invitation.invitedByName}
                </p>
              )}
            </div>
          </div>
          <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
            {config.icon}
            {config.label}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>Роль: <strong>{invitation.role}</strong></span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(invitation.createdAt).toLocaleDateString()}
          </p>
        </div>

        {invitation.message && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm">{invitation.message}</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2 mt-3">
            <Button
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
            >
              <CheckCircle className="h-4 w-4" />
              Принять
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
              onClick={handleReject}
            >
              <XCircle className="h-4 w-4" />
              Отклонить
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
