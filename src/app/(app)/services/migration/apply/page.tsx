'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PassportApplicationForm from '@/components/migration/PassportApplicationForm';
import { createPassportApplication, submitPassportApplication } from '@/lib/api/migration';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, Info } from 'lucide-react';

const steps = [
  'Личная информация',
  'Биографические данные',
  'Загрузка документов',
  'Проверка и подтверждение',
];

export default function PassportApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passportType = (searchParams?.get('type') || 'STANDARD') as 'STANDARD' | 'DIPLOMATIC' | 'SERVICE';

  const [activeStep, setActiveStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'Siberian Confederation',
    sex: '',
    height: undefined as number | undefined,
    eyeColor: '',
    fatherName: '',
    motherName: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    passportType,
    previousPassportNumber: '',
  });

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!formData.fullName || !formData.dateOfBirth || !formData.sex) {
        setError('Пожалуйста, заполните все обязательные поля');
        return;
      }
    }

    if (activeStep === 1) {
      if (!formData.placeOfBirth) {
        setError('Пожалуйста, заполните биографические данные');
        return;
      }
    }

    if (activeStep === 0 && !applicationId) {
      try {
        setLoading(true);
        const application = await createPassportApplication(formData);
        setApplicationId(application.id);
        toast.success('Черновик заявления создан');
      } catch (err: any) {
        setError(err.message || 'Не удалось создать заявление');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!applicationId) {
      setError('Заявление не создано');
      return;
    }

    try {
      setLoading(true);
      await submitPassportApplication(applicationId);
      toast.success('Заявление успешно подано!');
      router.push(`/services/migration/applications/${applicationId}`);
    } catch (err: any) {
      setError(err.message || 'Не удалось подать заявление');
    } finally {
      setLoading(false);
    }
  };

  const passportLabel =
    passportType === 'STANDARD' ? 'Стандартный' :
    passportType === 'DIPLOMATIC' ? 'Дипломатический' : 'Служебный';

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/services/migration')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к службе миграции
        </Button>
        <h1 className="text-3xl font-bold">Заявление на паспорт</h1>
        <p className="text-muted-foreground mt-1">
          {passportLabel} паспорт — Заполните все шаги для подачи заявления
        </p>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-8">
            {steps.map((label, index) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= activeStep
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-[100px]">{label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < activeStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">✕</button>
            </div>
          )}

          {/* Form Content */}
          <PassportApplicationForm
            step={activeStep}
            formData={formData}
            onChange={setFormData}
            applicationId={applicationId}
          />

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button onClick={handleSubmit} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Отправка...' : 'Подать заявление'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={loading}>
                {loading ? 'Сохранение...' : 'Далее'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-2 items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold mb-1">Важная информация</p>
            <p className="text-sm text-muted-foreground">
              • Вся информация должна быть точной и проверяемой<br />
              • Необходимые документы: Фото (паспортного размера), Подпись, Свидетельство о рождении<br />
              • Срок обработки: 5–10 рабочих дней<br />
              • Вы получите уведомление по email при изменении статуса заявления
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
