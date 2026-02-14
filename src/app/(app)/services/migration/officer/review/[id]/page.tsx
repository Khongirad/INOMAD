'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPassportApplication,
  getPassportDocuments,
  reviewPassportApplication,
  type PassportApplication,
  type Document,
} from '@/lib/api/migration';
import { ArrowLeft, CheckCircle, XCircle, Download, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ApplicationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params?.id as string;

  const [application, setApplication] = useState<PassportApplication | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [passportNumber, setPassportNumber] = useState('');

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const [appData, docsData] = await Promise.all([
        getPassportApplication(applicationId),
        getPassportDocuments(applicationId),
      ]);
      setApplication(appData);
      setDocuments(docsData);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить заявление');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    try {
      setSubmitting(true);
      await reviewPassportApplication(applicationId, reviewAction, reviewNotes, passportNumber);
      toast.success(reviewAction === 'APPROVE' ? 'Заявление одобрено' : 'Заявление отклонено');
      setReviewDialog(false);
      router.push('/services/migration/officer');
    } catch (err: any) {
      setError(err.message || 'Не удалось обработать рассмотрение');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (action: 'APPROVE' | 'REJECT') => {
    setReviewAction(action);
    setReviewNotes('');
    setPassportNumber('');
    setReviewDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4">
          {error || 'Заявление не найдено'}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="secondary">Подано</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">На рассмотрении</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Одобрено</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Отклонено</Badge>;
      case 'ISSUED':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Выдано</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/services/migration/officer')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к панели
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Рассмотрение заявления</h1>
            <p className="text-muted-foreground mt-1">
              {application.passportType} паспорт — {application.fullName}
            </p>
          </div>
          {getStatusBadge(application.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Личная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">ФИО</p>
              <p className="font-semibold">{application.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Дата рождения</p>
              <p>{new Date(application.dateOfBirth).toLocaleDateString('ru-RU')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Пол</p>
              <p>{application.sex}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Гражданство</p>
              <p>{application.nationality}</p>
            </div>
            {application.height && (
              <div>
                <p className="text-xs text-muted-foreground">Рост</p>
                <p>{application.height} см</p>
              </div>
            )}
            {application.eyeColor && (
              <div>
                <p className="text-xs text-muted-foreground">Цвет глаз</p>
                <p>{application.eyeColor}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Biographical Data */}
        <Card>
          <CardHeader>
            <CardTitle>Биографические данные</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Место рождения</p>
              <p>{application.placeOfBirth}</p>
            </div>
            {application.fatherName && (
              <div>
                <p className="text-xs text-muted-foreground">Имя отца</p>
                <p>{application.fatherName}</p>
              </div>
            )}
            {application.motherName && (
              <div>
                <p className="text-xs text-muted-foreground">Имя матери</p>
                <p>{application.motherName}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Адрес</p>
              <p>{application.address}</p>
              <p className="text-sm text-muted-foreground">
                {application.city}, {application.region} {application.postalCode}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Загруженные документы (зашифрованы)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 flex gap-2">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Все документы зашифрованы алгоритмом AES-256-GCM. Доступ регистрируется и проверяется.
              </p>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Документы ещё не загружены</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="border">
                    <CardContent className="pt-4">
                      <p className="font-medium text-sm mb-1">{doc.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Загружено: {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')}
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="h-3 w-3 mr-2" />
                        Просмотр (Расшифровать)
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Officer Notes */}
        {application.reviewNotes && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Предыдущие замечания</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{application.reviewNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {application.status !== 'APPROVED' && application.status !== 'REJECTED' && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Действия рассмотрения</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                  onClick={() => openReviewDialog('APPROVE')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Одобрить заявление
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  size="lg"
                  onClick={() => openReviewDialog('REJECT')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Отклонить заявление
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVE' ? 'Одобрить заявление' : 'Отклонить заявление'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'APPROVE'
                ? 'Подтвердите одобрение и назначьте номер паспорта'
                : 'Укажите причину отклонения'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewAction === 'APPROVE' && (
              <div className="space-y-2">
                <Label>Номер паспорта</Label>
                <Input
                  placeholder="SC-XXXX-XXXX"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Сгенерируйте и назначьте номер паспорта</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Замечания</Label>
              <Textarea
                placeholder={
                  reviewAction === 'APPROVE'
                    ? 'Необязательные замечания к одобрению'
                    : 'Обязательно: Причина отклонения'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button
              onClick={handleReview}
              disabled={submitting || (reviewAction === 'REJECT' && !reviewNotes.trim())}
              className={reviewAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Обработка...
                </>
              ) : (
                `Подтвердить ${reviewAction === 'APPROVE' ? 'одобрение' : 'отклонение'}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
