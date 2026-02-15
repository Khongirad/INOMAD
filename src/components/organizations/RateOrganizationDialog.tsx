'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Star, DollarSign, Heart, Award, Loader2 } from 'lucide-react';

interface RatingData {
  financialScore: number;
  trustScore: number;
  qualityScore: number;
}

interface RateOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
  organizationName: string;
  organizationId: string;
  onSubmit: (data: RatingData) => Promise<void>;
}

const getScoreColor = (score: number) => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

export function RateOrganizationDialog({
  open,
  onClose,
  organizationName,
  organizationId,
  onSubmit,
}: RateOrganizationDialogProps) {
  const [financialScore, setFinancialScore] = useState(5);
  const [trustScore, setTrustScore] = useState(5);
  const [qualityScore, setQualityScore] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await onSubmit({ financialScore, trustScore, qualityScore });
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const overallScore = ((financialScore + trustScore + qualityScore) / 3).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Организацию
          </DialogTitle>
          <DialogDescription>{organizationName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Financial Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Финансовая надёжность
              </Label>
              <span className={`text-lg font-bold ${getScoreColor(financialScore)}`}>
                {financialScore.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={financialScore}
              onChange={(e) => setFinancialScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Trust Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Trust
              </Label>
              <span className={`text-lg font-bold ${getScoreColor(trustScore)}`}>
                {trustScore.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={trustScore}
              onChange={(e) => setTrustScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Quality Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                Service Quality
              </Label>
              <span className={`text-lg font-bold ${getScoreColor(qualityScore)}`}>
                {qualityScore.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={qualityScore}
              onChange={(e) => setQualityScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Overall */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Общая rating</p>
            <p className={`text-3xl font-bold ${getScoreColor(parseFloat(overallScore))}`}>
              {overallScore}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Отправка...' : 'Send Оценку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
