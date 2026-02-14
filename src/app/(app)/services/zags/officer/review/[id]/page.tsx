'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  getMarriage,
  approveMarriage,
  rejectMarriage,
  type Marriage,
} from '@/lib/api/zags';

export default function MarriageReviewPage() {
  const params = useParams();
  const router = useRouter();
  const marriageId = params?.id as string;

  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');

  useEffect(() => {
    loadMarriage();
  }, [marriageId]);

  const loadMarriage = async () => {
    try {
      setLoading(true);
      const data = await getMarriage(marriageId);
      setMarriage(data);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    try {
      setSubmitting(true);
      if (reviewAction === 'APPROVE') {
        await approveMarriage(marriageId, certificateNumber);
      } else {
        await rejectMarriage(marriageId, notes);
      }
      setReviewDialog(false);
      router.push('/services/zags/officer');
    } catch (err: any) {
      setError(err.message || 'Не удалось обработать');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewDialog = (action: 'APPROVE' | 'REJECT') => {
    setReviewAction(action);
    setReviewDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !marriage) {
    return (
      <div className="p-4">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">
          {error || 'Брак не найден'}
        </div>
      </div>
    );
  }

  const consentComplete = marriage.spouse1ConsentGranted && marriage.spouse2ConsentGranted;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/zags/officer')} className="mb-2">
          ← Назад к панели
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Рассмотрение заявления на брак</h1>
            <p className="text-muted-foreground mt-1">{marriage.spouse1FullName} & {marriage.spouse2FullName}</p>
          </div>
          <Badge variant={marriage.status === 'REGISTERED' ? 'default' : 'secondary'}>
            {marriage.status}
          </Badge>
        </div>
      </div>

      {/* Consent Status */}
      <Card>
        <CardHeader><CardTitle>Статус согласий</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span>{marriage.spouse1FullName}</span>
            <Badge variant={marriage.spouse1ConsentGranted ? 'default' : 'secondary'}>
              {marriage.spouse1ConsentGranted ? '✓ Согласие дано' : '⏳ Ожидание'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>{marriage.spouse2FullName}</span>
            <Badge variant={marriage.spouse2ConsentGranted ? 'default' : 'secondary'}>
              {marriage.spouse2ConsentGranted ? '✓ Согласие дано' : '⏳ Ожидание'}
            </Badge>
          </div>
          {!consentComplete && (
            <div className="bg-yellow-500/10 text-yellow-400 rounded-lg p-3 text-sm mt-2">
              Необходимо двустороннее согласие для рассмотрения.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Marriage Details */}
        <Card>
          <CardHeader><CardTitle>Детали брака</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Дата брака</p>
              <p className="font-semibold">{new Date(marriage.marriageDate).toLocaleDateString('ru-RU')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Тип церемонии</p>
              <p>{marriage.ceremonyType || 'Гражданская'}</p>
            </div>
            {marriage.ceremonyLocation && (
              <div>
                <p className="text-xs text-muted-foreground">Место</p>
                <p>{marriage.ceremonyLocation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spouse Info */}
        <Card>
          <CardHeader><CardTitle>Данные супругов</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Супруг 1</p>
              <p className="font-semibold">{marriage.spouse1FullName}</p>
              <p className="text-xs text-muted-foreground">Дата рождения: {new Date(marriage.spouse1DateOfBirth).toLocaleDateString('ru-RU')}</p>
            </div>
            <hr className="border-border" />
            <div>
              <p className="text-xs text-muted-foreground">Супруг 2</p>
              <p className="font-semibold">{marriage.spouse2FullName}</p>
              <p className="text-xs text-muted-foreground">Дата рождения: {new Date(marriage.spouse2DateOfBirth).toLocaleDateString('ru-RU')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Regime */}
      {marriage.propertyRegime && (
        <Card>
          <CardHeader><CardTitle>Режим имущества</CardTitle></CardHeader>
          <CardContent>
            <Badge>{marriage.propertyRegime}</Badge>
            {marriage.propertyAgreement && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Детали соглашения</p>
                <p className="text-sm">{marriage.propertyAgreement}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificate */}
      {marriage.certificateNumber && (
        <Card>
          <CardHeader><CardTitle>Свидетельство</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <div>
                <p className="text-xs text-muted-foreground">Номер свидетельства</p>
                <p className="font-semibold">{marriage.certificateNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {marriage.status === 'PENDING_REVIEW' && consentComplete && (
        <Card>
          <CardHeader><CardTitle>Действия</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => openReviewDialog('APPROVE')}>
                ✓ Одобрить и выдать свидетельство
              </Button>
              <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => openReviewDialog('REJECT')}>
                ✕ Отклонить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVE' ? 'Одобрить брак' : 'Отклонить заявление'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'APPROVE'
                ? 'Это зарегистрирует брак и выдаст свидетельство'
                : 'Укажите причину отклонения'}
            </DialogDescription>
          </DialogHeader>
          {reviewAction === 'APPROVE' ? (
            <div className="space-y-3">
              <div className="bg-green-500/10 text-green-400 rounded-lg p-3 text-sm">
                Брак будет зарегистрирован и выдано официальное свидетельство
              </div>
              <div>
                <Label>Номер свидетельства</Label>
                <Input placeholder="MC-XXXX-XXXX" value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <Label>Причина отклонения *</Label>
              <Textarea rows={4} placeholder="Обязательно: причина отклонения" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)} disabled={submitting}>Отмена</Button>
            <Button
              onClick={handleReview}
              variant={reviewAction === 'APPROVE' ? 'primary' : 'destructive'}
              disabled={
                submitting ||
                (reviewAction === 'APPROVE' && !certificateNumber.trim()) ||
                (reviewAction === 'REJECT' && !notes.trim())
              }
            >
              {submitting ? 'Обработка…' : `Подтвердить ${reviewAction === 'APPROVE' ? 'одобрение' : 'отклонение'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
