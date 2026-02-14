'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMarriage, grantMarriageConsent } from '@/lib/api/zags';
import { toast } from 'sonner';

export default function MarriageConsentPage() {
  const params = useParams();
  const router = useRouter();
  const marriageId = params?.id as string;

  const [marriage, setMarriage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarriage();
  }, [marriageId]);

  const loadMarriage = async () => {
    try {
      setLoading(true);
      const data = await getMarriage(marriageId);
      setMarriage(data);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить заявление');
    } finally {
      setLoading(false);
    }
  };

  const handleConsent = async (approve: boolean) => {
    if (approve && !signature.trim()) {
      toast.error('Введите вашу цифровую подпись');
      return;
    }
    try {
      setSubmitting(true);
      await grantMarriageConsent(marriageId, approve, signature);
      toast.success(approve ? 'Согласие дано!' : 'Заявление отклонено');
      router.push('/services/zags');
    } catch (err: any) {
      toast.error(err.message || 'Не удалось обработать согласие');
    } finally {
      setSubmitting(false);
    }
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
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">
          {error || 'Заявление на брак не найдено'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/zags')} className="mb-2">
          ← Назад в ЗАГС
        </Button>
        <h1 className="text-2xl font-bold">Согласие на брак</h1>
        <p className="text-muted-foreground mt-1">Рассмотрите и дайте согласие на заявление</p>
      </div>

      <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4 text-sm">
        Ваш партнёр подал заявление на брак. Пожалуйста, ознакомьтесь с деталями и дайте согласие.
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Marriage details */}
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Супруги</p>
            <p className="text-lg font-semibold">{marriage.spouse1FullName} & {marriage.spouse2FullName}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Дата рождения супруга 1</p>
              <p>{new Date(marriage.spouse1DateOfBirth).toLocaleDateString('ru-RU')}</p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Дата рождения супруга 2</p>
              <p>{new Date(marriage.spouse2DateOfBirth).toLocaleDateString('ru-RU')}</p>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Желаемая дата брака</p>
            <p>{new Date(marriage.marriageDate).toLocaleDateString('ru-RU')}</p>
          </div>

          {marriage.ceremonyLocation && (
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Место церемонии</p>
              <p>{marriage.ceremonyLocation}</p>
            </div>
          )}

          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Режим имущества</p>
            <p>{marriage.propertyRegime || 'SEPARATE'}</p>
          </div>

          {/* Digital Signature */}
          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2">Цифровая подпись</h3>
            <p className="text-sm text-muted-foreground mb-3">Введите ваше полное имя в качестве цифровой подписи для согласия</p>
            <div>
              <Label>Ваше полное имя (цифровая подпись)</Label>
              <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Введите имя точно как в документе" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleConsent(false)} disabled={submitting}>
              ✕ Отклонить
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleConsent(true)} disabled={submitting || !signature.trim()}>
              {submitting ? 'Обработка…' : '✓ Дать согласие'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-yellow-500/10 text-yellow-400 rounded-lg p-4 text-sm">
        <p className="font-semibold">⚠️ Важное юридическое уведомление</p>
        <p>Давая согласие, вы соглашаетесь на юридически обязывающий брак. Это действие невозможно отменить без бракоразводного процесса.</p>
      </div>
    </div>
  );
}
