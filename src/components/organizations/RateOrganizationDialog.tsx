'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Slider,
  Alert,
} from '@mui/material';
import { Star, DollarSign, Heart, Award } from 'lucide-react';

interface RateOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
  organizationName: string;
  organizationId: string;
  onSubmit: (ratings: RatingData) => Promise<void>;
}

export interface RatingData {
  financialScore: number;
  trustScore: number;
  qualityScore: number;
  notes?: string;
}

export function RateOrganizationDialog({
  open,
  onClose,
  organizationName,
  organizationId,
  onSubmit,
}: RateOrganizationDialogProps) {
  const [financialScore, setFinancialScore] = useState<number>(5);
  const [trustScore, setTrustScore] = useState<number>(5);
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      await onSubmit({
        financialScore,
        trustScore,
        qualityScore,
      });
      
      onClose();
      
      // Reset values
      setFinancialScore(5);
      setTrustScore(5);
      setQualityScore(5);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке оценки');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'success.main';
    if (score >= 6) return 'warning.main';
    return 'error.main';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Star size={24} />
          Оценить Организацию
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="h6" gutterBottom>
          {organizationName}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          Оцените организацию по трём критериям. Каждый критерий оценивается от 1 до 10.
        </Alert>

        {/* Financial Score */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <DollarSign size={20} />
            <Typography variant="subtitle2">Финансовая Надёжность</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Своевременность платежей, финансовая стабильность
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={financialScore}
              onChange={(e, v) => setFinancialScore(v as number)}
              min={1}
              max={10}
              step={0.5}
              marks
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
            <Typography
              variant="h6"
              color={getScoreColor(financialScore)}
              sx={{ minWidth: 40, textAlign: 'center' }}
            >
              {financialScore.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Trust Score */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Heart size={20} />
            <Typography variant="subtitle2">Доверие</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Надёжность, честность, выполнение обязательств
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={trustScore}
              onChange={(e, v) => setTrustScore(v as number)}
              min={1}
              max={10}
              step={0.5}
              marks
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
            <Typography
              variant="h6"
              color={getScoreColor(trustScore)}
              sx={{ minWidth: 40, textAlign: 'center' }}
            >
              {trustScore.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Quality Score */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Award size={20} />
            <Typography variant="subtitle2">Качество Работы</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Профессионализм, качество результатов, внимание к деталям
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider
              value={qualityScore}
              onChange={(e, v) => setQualityScore(v as number)}
              min={1}
              max={10}
              step={0.5}
              marks
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
            <Typography
              variant="h6"
              color={getScoreColor(qualityScore)}
              sx={{ minWidth: 40, textAlign: 'center' }}
            >
              {qualityScore.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Overall Preview */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Общий рейтинг
          </Typography>
          <Typography variant="h4" color="primary">
            {((financialScore * 0.4 + trustScore * 0.3 + qualityScore * 0.3)).toFixed(1)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            (40% финансы + 30% доверие + 30% качество)
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Отмена
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? 'Отправка...' : 'Отправить Оценку'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
