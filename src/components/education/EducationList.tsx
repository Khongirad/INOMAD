'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, CheckCircle, Clock, XCircle, School, BookOpen, ExternalLink } from 'lucide-react';

interface Education {
  id: string;
  type: string;
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  status: string;
  verifiedBy?: string;
  verifiedAt?: string;
  documentUrl?: string;
}

interface EducationListProps {
  educations: Education[];
  onViewDocument?: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  DIPLOMA: 'Diploma',
  CERTIFICATE: 'Сертификат',
  RECOMMENDATION: 'Рекомендация',
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  VERIFIED: {
    label: 'Confirmed',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'bg-green-600 hover:bg-green-700',
  },
  PENDING: {
    label: 'On проверке',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-yellow-600 hover:bg-yellow-700',
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-red-600 hover:bg-red-700',
  },
};

export function EducationList({ educations, onViewDocument }: EducationListProps) {
  if (educations.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No записей об образовании</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {educations.map((edu) => {
        const status = statusConfig[edu.status] || statusConfig.PENDING;

        return (
          <Card key={edu.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <School className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{edu.institution}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {edu.fieldOfStudy}
                    </p>
                  </div>
                </div>

                <Badge className={`gap-1 ${status.className}`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline">{typeLabels[edu.type] || edu.type}</Badge>
                {edu.graduationYear && (
                  <span className="text-muted-foreground">{edu.graduationYear}</span>
                )}
                {edu.verifiedBy && (
                  <span className="text-xs text-muted-foreground">
                    Проверил: {edu.verifiedBy}
                  </span>
                )}
              </div>

              {onViewDocument && edu.documentUrl && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => onViewDocument(edu.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Просмотреть document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
