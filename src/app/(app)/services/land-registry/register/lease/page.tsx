'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { registerLease } from '@/lib/api/land-registry';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, Key, Loader2, Info, AlertTriangle, CheckCircle } from 'lucide-react';

const STEPS = ['Выбор объекта', 'Условия аренды', 'Финансовые условия', 'Проверка и подача'];

export default function LeaseRegistrationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [landPlotId, setLandPlotId] = useState('');
  const [lessorName, setLessorName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [currency, setCurrency] = useState('ALTAN');
  const [paymentDay, setPaymentDay] = useState('1');
  const [deposit, setDeposit] = useState('');
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');

  const handleNext = () => setActiveStep((p) => p + 1);
  const handleBack = () => setActiveStep((p) => p - 1);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await registerLease({
        landPlotId, lessorUserId: lessorName, startDate, endDate,
        monthlyRent: parseFloat(monthlyRent), currency,
        paymentDay: parseInt(paymentDay),
        deposit: deposit ? parseFloat(deposit) : undefined, terms, notes,
      } as any);
      toast.success('Аренда зарегистрирована!');
      router.push('/services/land-registry');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка регистрации');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return landPlotId && lessorName;
    if (activeStep === 1) return startDate && endDate;
    if (activeStep === 2) return monthlyRent && paymentDay;
    return true;
  };

  const calcDuration = () => {
    if (!startDate || !endDate) return '';
    const m = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return `${m} мес. (${Math.floor(m / 12)} лет, ${m % 12} мес.)`;
  };

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/land-registry')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Назад
        </Button>
        <div className="flex items-center gap-3">
          <Key className="h-10 w-10 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Регистрация договора аренды</h1>
            <p className="text-muted-foreground mt-1">Доступно всем — гражданам и иностранцам</p>
          </div>
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex gap-2">
        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Аренда открыта для всех</p>
          <p className="text-sm text-muted-foreground">В отличие от собственности (только граждане), аренду может зарегистрировать любой.</p>
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= activeStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                  <span className="text-xs mt-1 text-center max-w-[90px]">{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < activeStep ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {activeStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Выбор объекта</h3><hr />
              <div className="space-y-2">
                <Label>ID участка / кадастровый номер</Label>
                <Input placeholder="Объект аренды" value={landPlotId} onChange={(e) => setLandPlotId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Арендодатель (собственник)</Label>
                <Input placeholder="Имя или ID собственника" value={lessorName} onChange={(e) => setLessorName(e.target.value)} />
                <p className="text-xs text-muted-foreground">Лицо, сдающее объект в аренду</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">Арендодатель должен будет подтвердить договор.</p>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Условия аренды</h3><hr />
              <div className="space-y-2">
                <Label>Дата начала</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Дата окончания</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                {calcDuration() && <p className="text-xs text-muted-foreground">Срок: {calcDuration()}</p>}
              </div>
              <div className="space-y-2">
                <Label>Условия договора</Label>
                <Textarea placeholder="Опишите условия аренды..." value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} />
                <p className="text-xs text-muted-foreground">Разрешённое использование, обязанности по обслуживанию и т.д.</p>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Финансовые условия</h3><hr />
              <div className="space-y-2">
                <Label>Ежемесячная арендная плата</Label>
                <Input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Валюта</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>День оплаты (1-31)</Label>
                <Input type="number" min={1} max={31} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Залог (необязательно)</Label>
                <Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Заметки</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Проверка договора аренды</h3><hr />
              <div><p className="text-xs text-muted-foreground">Объект</p><p className="font-semibold">{landPlotId}</p></div>
              <div><p className="text-xs text-muted-foreground">Арендодатель</p><p>{lessorName}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Период</p>
                <p>{startDate ? new Date(startDate).toLocaleDateString('ru-RU') : ''} → {endDate ? new Date(endDate).toLocaleDateString('ru-RU') : ''}</p>
                <p className="text-sm text-muted-foreground">{calcDuration()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Финансы</p>
                <p className="font-semibold">{monthlyRent} {currency}/мес.</p>
                <p className="text-sm">День оплаты: {paymentDay}</p>
                {deposit && <p className="text-sm">Залог: {deposit} {currency}</p>}
              </div>
              {terms && <div><p className="text-xs text-muted-foreground">Условия</p><p className="text-sm">{terms}</p></div>}
              {notes && <div><p className="text-xs text-muted-foreground">Заметки</p><p className="text-sm">{notes}</p></div>}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">⚠️ Требуется подтверждение арендодателя</p>
                  <p className="text-sm text-muted-foreground">Договор будет отправлен собственнику на подтверждение и записан в блокчейн ALTAN.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} disabled={activeStep === 0}><ArrowLeft className="h-4 w-4 mr-2" />Назад</Button>
            {activeStep === STEPS.length - 1 ? (
              <Button className="bg-yellow-600 hover:bg-yellow-700" onClick={handleSubmit} disabled={!canProceed() || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {submitting ? 'Регистрация...' : 'Подать на утверждение'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>Далее<ArrowRight className="h-4 w-4 ml-2" /></Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
