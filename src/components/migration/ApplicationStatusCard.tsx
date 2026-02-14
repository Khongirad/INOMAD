'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, FileText, Loader2 } from 'lucide-react';
import type { PassportApplication } from '@/lib/api/migration';

interface ApplicationStatusCardProps {
  application: PassportApplication;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; progress: number }> = {
  DRAFT: {
    label: 'Draft',
    icon: <FileText className="h-3.5 w-3.5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 text-blue-700',
    progress: 20,
  },
  SUBMITTED: {
    label: 'Submitted',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100 text-sky-700',
    progress: 40,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    icon: <Loader2 className="h-3.5 w-3.5" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 text-yellow-700',
    progress: 60,
  },
  APPROVED: {
    label: 'Approved',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 text-green-700',
    progress: 80,
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 text-red-700',
    progress: 100,
  },
  ISSUED: {
    label: 'Issued',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 text-green-700',
    progress: 100,
  },
};

export default function ApplicationStatusCard({ application, onClick }: ApplicationStatusCardProps) {
  const config = STATUS_CONFIG[application.status] || STATUS_CONFIG.DRAFT;

  return (
    <Card
      className={`transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{application.passportType} Passport</h3>
            <p className="text-sm text-muted-foreground">Applicant: {application.fullName}</p>
            <p className="text-xs text-muted-foreground">
              Applied: {new Date(application.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className={`gap-1 ${config.bgColor}`}>
            {config.icon}
            {config.label}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">Application Progress</span>
            <span className="text-xs text-muted-foreground">{config.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                application.status === 'REJECTED' ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${config.progress}%` }}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex gap-2 flex-wrap">
          {application.issuedPassportNumber && (
            <Badge variant="outline" className="text-xs">
              Passport: {application.issuedPassportNumber}
            </Badge>
          )}
          {application.expiresAt && (
            <Badge variant="outline" className="text-xs">
              Expires: {new Date(application.expiresAt).toLocaleDateString()}
            </Badge>
          )}
          {application.reviewNotes && (
            <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700">
              Has Notes
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
