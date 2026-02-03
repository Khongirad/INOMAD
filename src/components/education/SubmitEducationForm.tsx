'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { GraduationCap, Upload, UserCheck } from 'lucide-react';

type EducationType = 'DIPLOMA' | 'CERTIFICATE' | 'RECOMMENDATION';

interface SubmitEducationFormProps {
  onSubmit: (data: EducationFormData) => Promise<void>;
  onCancel?: () => void;
}

export interface EducationFormData {
  type: EducationType;
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  documentHash?: string;
  documentUrl?: string;
  recommenderId?: string;
}

export function SubmitEducationForm({ onSubmit, onCancel }: SubmitEducationFormProps) {
  const [formData, setFormData] = useState<EducationFormData>({
    type: 'DIPLOMA',
    institution: '',
    fieldOfStudy: '',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.institution || !formData.fieldOfStudy) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (formData.type === 'RECOMMENDATION' && !formData.recommenderId) {
      setError('Выберите специалиста для рекомендации');
      return;
    }

    if (formData.type !== 'RECOMMENDATION' && !formData.documentUrl) {
      setError('Загрузите документ (диплом/сертификат)');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // TODO: Upload to IPFS or backend storage
      // For now, simulate upload
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const mockHash = `ipfs://${Math.random().toString(36).substring(7)}`;
      const mockUrl = URL.createObjectURL(file);
      
      setFormData({
        ...formData,
        documentHash: mockHash,
        documentUrl: mockUrl,
      });
    } catch (err) {
      setError('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GraduationCap size={24} />
            <Typography variant="h6">Подтверждение Образования</Typography>
          </Box>
        }
      />
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Type Selection */}
            <FormControl fullWidth>
              <InputLabel>Тип Документа</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as EducationType })
                }
                label="Тип Документа"
              >
                <MenuItem value="DIPLOMA">Диплом</MenuItem>
                <MenuItem value="CERTIFICATE">Сертификат</MenuItem>
                <MenuItem value="RECOMMENDATION">Рекомендация Специалиста</MenuItem>
              </Select>
            </FormControl>

            {/* Field of Study */}
            <TextField
              label="Специальность"
              value={formData.fieldOfStudy}
              onChange={(e) =>
                setFormData({ ...formData, fieldOfStudy: e.target.value })
              }
              required
              placeholder="Engineering, Medicine, Law, etc."
            />

            {/* Institution */}
            <TextField
              label="Учебное Заведение / Организация"
              value={formData.institution}
              onChange={(e) =>
                setFormData({ ...formData, institution: e.target.value })
              }
              required
              placeholder="Название университета или организации"
            />

            {/* Graduation Year (for diploma/certificate) */}
            {formData.type !== 'RECOMMENDATION' && (
              <TextField
                label="Год Окончания"
                type="number"
                value={formData.graduationYear || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    graduationYear: parseInt(e.target.value) || undefined,
                  })
                }
                placeholder="2020"
              />
            )}

            {/* Document Upload (for diploma/certificate) */}
            {formData.type !== 'RECOMMENDATION' && (
              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<Upload size={20} />}
                  disabled={uploading}
                  fullWidth
                >
                  {uploading ? 'Загрузка...' : 'Загрузить Документ'}
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
                </Button>
                {formData.documentUrl && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 1 }}>
                    ✓ Документ загружен
                  </Typography>
                )}
              </Box>
            )}

            {/* Recommender Selection (for recommendation) */}
            {formData.type === 'RECOMMENDATION' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Выберите сертифицированного специалиста в вашей области
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<UserCheck size={20} />}
                  fullWidth
                  onClick={() => {
                    // TODO: Open specialist selector modal
                    alert('Specialist selector modal - TODO');
                  }}
                >
                  {formData.recommenderId ? 'Специалист выбран' : 'Выбрать Специалиста'}
                </Button>
              </Box>
            )}

            {/* Info Alert */}
            <Alert severity="info">
              {formData.type === 'RECOMMENDATION'
                ? 'Рекомендация должна быть предоставлена сертифицированным специалистом в вашей области.'
                : 'Загрузите скан диплома или сертификата. Документ будет проверен администратором.'}
            </Alert>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {onCancel && (
                <Button onClick={onCancel} variant="outlined">
                  Отмена
                </Button>
              )}
              <Button type="submit" variant="contained" disabled={uploading}>
                Отправить на Проверку
              </Button>
            </Box>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
