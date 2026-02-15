'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Upload, Loader2 } from 'lucide-react';

type EducationType = 'DIPLOMA' | 'CERTIFICATE' | 'RECOMMENDATION';

interface EducationFormData {
  type: EducationType;
  institution: string;
  fieldOfStudy: string;
  graduationYear?: number;
  documentFile?: File;
  verifierId?: string;
}

interface SubmitEducationFormProps {
  onSubmit: (data: EducationFormData) => Promise<void>;
  onCancel?: () => void;
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

    if (!formData.institution || !formData.fieldOfStudy) {
      setError('Заgenderните обязательные genderя');
      return;
    }

    try {
      setUploading(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Error при отправке');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <GraduationCap className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Confirmation Образования</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Type Documentа</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as EducationType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIPLOMA">Diploma</SelectItem>
                <SelectItem value="CERTIFICATE">Сертификат</SelectItem>
                <SelectItem value="RECOMMENDATION">Рекомендация Специалиста</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Учебное Заведение *</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="Title учебного заведения"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fieldOfStudy">Specialty *</Label>
            <Input
              id="fieldOfStudy"
              value={formData.fieldOfStudy}
              onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
              placeholder="Направление обучения"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduationYear">Year of Graduation</Label>
            <Input
              id="graduationYear"
              type="number"
              value={formData.graduationYear || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  graduationYear: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="2024"
            />
          </div>

          <div className="space-y-2">
            <Label>Document</Label>
            <label className="flex items-center justify-center gap-2 w-full h-10 px-4 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
              <Upload className="h-4 w-4" />
              {formData.documentFile ? formData.documentFile.name : 'Upload document'}
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFormData({ ...formData, documentFile: file });
                }}
              />
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={uploading} className="gap-2">
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Send на Проверку
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
