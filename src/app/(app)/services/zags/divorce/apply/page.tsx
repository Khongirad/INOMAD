'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMyMarriages, fileDivorce, type Marriage } from '@/lib/api/zags';
import { toast } from 'sonner';

const STEPS = ['Election marriageа', 'Причины divorceа', 'Раздел имущества', 'Verification и подача'];

export default function DivorceApplicationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [marriages, setMarriages] = useState<Marriage[]>([]);

  const [selectedMarriageId, setSelectedMarriageId] = useState('');
  const [reason, setReason] = useState('');
  const [propertyDivision, setPropertyDivision] = useState('');

  useEffect(() => {
    loadMarriages();
  }, []);

  const loadMarriages = async () => {
    try {
      setLoading(true);
      const data = await getMyMarriages();
      setMarriages(data.filter((m) => m.status === 'REGISTERED'));
    } catch (err: any) {
      toast.error(err.message || 'Не удалось upload data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await fileDivorce({
        marriageId: selectedMarriageId,
        reason,
        propertyDivision: propertyDivision || undefined,
      });
      toast.success('Application на divorce подано');
      router.push('/services/zags');
    } catch (err: any) {
      toast.error(err.message || 'Не удалось поgive application');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMarriage = marriages.find((m) => m.id === selectedMarriageId);

  const canProceed = () => {
    switch (activeStep) {
      case 0: return selectedMarriageId !== '';
      case 1: return reason.trim().length > 0;
      default: return true;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/zags')} className="mb-2">
          ← Back в Civil Registry
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">💔</span>
          <div>
            <h1 className="text-2xl font-bold">Byдача applications на divorce</h1>
            <p className="text-muted-foreground">Byдайте application на расторжение marriageа</p>
          </div>
        </div>
      </div>

      {marriages.length === 0 ? (
        <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4">
          У вас no registeredных marriageов. Divorce возможен only for registeredных marriageов.
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= activeStep ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < activeStep ? '✓' : i + 1}
                </div>
                <span className={`text-sm hidden md:inline ${i <= activeStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Step 0 */}
              {activeStep === 0 && (
                <>
                  <h3 className="text-lg font-semibold">Select marriage for расторжения</h3>
                  <Select value={selectedMarriageId} onValueChange={setSelectedMarriageId}>
                    <SelectTrigger><SelectValue placeholder="Select marriage" /></SelectTrigger>
                    <SelectContent>
                      {marriages.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.spouse1FullName} & {m.spouse2FullName} — {new Date(m.marriageDate).toLocaleDateString('ru-RU')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMarriage && (
                    <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4 text-sm space-y-1">
                      <p className="font-semibold">Selected marriage</p>
                      <p><strong>Spouseи:</strong> {selectedMarriage.spouse1FullName} & {selectedMarriage.spouse2FullName}</p>
                      <p><strong>Date:</strong> {new Date(selectedMarriage.marriageDate).toLocaleDateString('ru-RU')}</p>
                      <p><strong>Режим имущества:</strong> {selectedMarriage.propertyRegime || 'Не указано'}</p>
                    </div>
                  )}
                </>
              )}

              {/* Step 1 */}
              {activeStep === 1 && (
                <>
                  <h3 className="text-lg font-semibold">Причины divorceа</h3>
                  <div>
                    <Label>Причина divorceа *</Label>
                    <Textarea rows={6} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Byдробно опишите причины…" />
                    <p className="text-xs text-muted-foreground mt-1">Эта information будет рассмотрена сотрудником Civil Registry</p>
                  </div>
                  <div className="bg-yellow-500/10 text-yellow-400 rounded-lg p-4 text-sm">
                    <p className="font-semibold">⚠️ Важное notification</p>
                    <p>Byдача applications на divorce — серьёзное юридическое action. Your spouse(а) будет уведомлён(а).</p>
                  </div>
                </>
              )}

              {/* Step 2 */}
              {activeStep === 2 && (
                <>
                  <h3 className="text-lg font-semibold">Раздел имущества (optional)</h3>
                  {selectedMarriage?.propertyRegime && (
                    <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4 text-sm">
                      <p><strong>Current режим:</strong> {selectedMarriage.propertyRegime}</p>
                      {selectedMarriage.propertyAgreement && (
                        <p><strong>Contract:</strong> {selectedMarriage.propertyAgreement}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label>Предлагаемый раздел имущества</Label>
                    <Textarea rows={6} value={propertyDivision} onChange={(e) => setPropertyDivision(e.target.value)} placeholder="Опишите, как предлагаете разделить совместное имущество…" />
                  </div>
                </>
              )}

              {/* Step 3: Review */}
              {activeStep === 3 && (
                <>
                  <h3 className="text-lg font-semibold">Verification applications</h3>
                  <div className="space-y-3">
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Marriage</p>
                      <p className="font-semibold">{selectedMarriage?.spouse1FullName} & {selectedMarriage?.spouse2FullName}</p>
                      <p className="text-xs text-muted-foreground">Certificate: {selectedMarriage?.certificateNumber}</p>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Причина</p>
                      <p>{reason}</p>
                    </div>
                    {propertyDivision && (
                      <div className="border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Раздел имущества</p>
                        <p>{propertyDivision}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                    <p className="font-semibold">⚠️ Byдтверждение</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>All provided information is correct</li>
                      <li>You понимаете, что это начнёт marriageоdivorceный process</li>
                      <li>Spouse(а) будет уведомлён(а) официально</li>
                      <li>Action сложно отменить</li>
                    </ul>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveStep((p) => p - 1)} disabled={activeStep === 0}>
                  ← Back
                </Button>
                {activeStep === STEPS.length - 1 ? (
                  <Button variant="destructive" onClick={handleSubmit} disabled={!canProceed() || submitting}>
                    {submitting ? 'Отправка…' : '📤 Bygive application'}
                  </Button>
                ) : (
                  <Button onClick={() => setActiveStep((p) => p + 1)} disabled={!canProceed()}>
                    Next →
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
