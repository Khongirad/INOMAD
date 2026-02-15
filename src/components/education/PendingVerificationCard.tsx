'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  School,
  BookOpen,
  User,
  Loader2,
} from 'lucide-react';

interface PendingVerification {
  id: string;
  userId: string;
  userName?: string;
  type: string;
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  documentUrl?: string;
  createdAt: string;
}

interface PendingVerificationCardProps {
  verification: PendingVerification;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

const typeLabels: Record<string, string> = {
  DIPLOMA: 'Diploma',
  CERTIFICATE: 'Сертификат',
  RECOMMENDATION: 'Рекомендация',
};

export function PendingVerificationCard({
  verification,
  onApprove,
  onReject,
}: PendingVerificationCardProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setLoading(true);
      await onApprove(verification.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setLoading(true);
      await onReject(verification.id, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-semibold">{verification.institution}</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {verification.fieldOfStudy}
                </p>
              </div>
            </div>

            <Badge className="bg-yellow-600 hover:bg-yellow-700 gap-1">
              <Clock className="h-3 w-3" />
              On проверке
            </Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Applicant: <strong>{verification.userName || verification.userId}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{typeLabels[verification.type] || verification.type}</Badge>
              {verification.graduationYear && (
                <span className="text-sm text-muted-foreground">{verification.graduationYear}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Filed: {new Date(verification.createdAt).toLocaleDateString()}
            </p>
          </div>

          {verification.documentUrl && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-muted-foreground">
                📄 Document прикреплён
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirm
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setRejectDialogOpen(true)}
              disabled={loading}
            >
              <XCircle className="h-4 w-4" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline верификацию</DialogTitle>
            <DialogDescription>
              Укажите причину отклонения for {verification.institution}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Причина отклонения</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину..."
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ Это action нельзя отменить. Genderьзователь genderучит notification с причиной отклонения.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
