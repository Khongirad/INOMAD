'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createMarriageApplication, checkMarriageEligibility } from '@/lib/api/zags';
import { toast } from 'sonner';

const STEPS = ['Data partner', 'Details marriageа', 'Property режим', 'Verification и подача'];

export default function MarriageApplicationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    partnerId: '',
    spouse1FullName: '',
    spouse2FullName: '',
    spouse1DateOfBirth: '',
    spouse2DateOfBirth: '',
    marriageDate: '',
    ceremonyLocation: '',
    ceremonyType: 'Civil' as 'Civil' | 'Religious' | 'Traditional',
    witness1Name: '',
    witness2Name: '',
    witness1Id: '',
    witness2Id: '',
    propertyRegime: 'SEPARATE' as 'SEPARATE' | 'JOINT' | 'CUSTOM',
    propertyAgreement: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!formData.partnerId || !formData.spouse1FullName || !formData.spouse2FullName) {
        setError('Заgenderните all genderя информации о partnerе');
        return;
      }
      try {
        setLoading(true);
        await checkMarriageEligibility('current-user');
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'You не имеете права на заkeyение marriageа');
        setLoading(false);
        return;
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
    try {
      setLoading(true);
      await createMarriageApplication(formData);
      toast.success('Application подано! Pendingся consent partner…');
      router.push('/services/zags');
    } catch (err: any) {
      setError(err.message || 'Не удалось поgive application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/zags')} className="mb-2">
          ← Back в Civil Registry
        </Button>
        <h1 className="text-2xl font-bold">Application на регистрацию marriageа</h1>
        <p className="text-muted-foreground mt-1">Оба partner должны give consent</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= activeStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
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

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm underline">Close</button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Step 0: Partner Info */}
          {activeStep === 0 && (
            <>
              <h3 className="text-lg font-semibold">Data partner</h3>
              <div className="space-y-3">
                <div>
                  <Label>Partner ID *</Label>
                  <Input value={formData.partnerId} onChange={(e) => handleChange('partnerId', e.target.value)} placeholder="Name genderьзователя or ID" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>ФИО spouseа 1 *</Label>
                    <Input value={formData.spouse1FullName} onChange={(e) => handleChange('spouse1FullName', e.target.value)} />
                  </div>
                  <div>
                    <Label>ФИО spouseа 2 *</Label>
                    <Input value={formData.spouse2FullName} onChange={(e) => handleChange('spouse2FullName', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Date рождения spouseа 1 *</Label>
                    <Input type="date" value={formData.spouse1DateOfBirth} onChange={(e) => handleChange('spouse1DateOfBirth', e.target.value)} />
                  </div>
                  <div>
                    <Label>Date рождения spouseа 2 *</Label>
                    <Input type="date" value={formData.spouse2DateOfBirth} onChange={(e) => handleChange('spouse2DateOfBirth', e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 1: Marriage Details */}
          {activeStep === 1 && (
            <>
              <h3 className="text-lg font-semibold">Details marriageа</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Desired Date marriageа *</Label>
                    <Input type="date" value={formData.marriageDate} onChange={(e) => handleChange('marriageDate', e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Минимум 30 days от today</p>
                  </div>
                  <div>
                    <Label>Type церемонии</Label>
                    <Select value={formData.ceremonyType} onValueChange={(v) => handleChange('ceremonyType', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Civil">Citizenская</SelectItem>
                        <SelectItem value="Religious">Религиозная</SelectItem>
                        <SelectItem value="Traditional">Традиционная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Seat церемонии</Label>
                  <Input value={formData.ceremonyLocation} onChange={(e) => handleChange('ceremonyLocation', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Name свидетеля 1</Label>
                    <Input value={formData.witness1Name} onChange={(e) => handleChange('witness1Name', e.target.value)} />
                  </div>
                  <div>
                    <Label>Name свидетеля 2</Label>
                    <Input value={formData.witness2Name} onChange={(e) => handleChange('witness2Name', e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Property Regime */}
          {activeStep === 2 && (
            <>
              <h3 className="text-lg font-semibold">Property режим</h3>
              <p className="text-sm text-muted-foreground mb-3">Select порядок управления имуществом в marriageе</p>
              <div>
                <Label>Режим имущества</Label>
                <Select value={formData.propertyRegime} onValueChange={(v) => handleChange('propertyRegime', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEPARATE">Раздельное имущество</SelectItem>
                    <SelectItem value="JOINT">Совместное имущество</SelectItem>
                    <SelectItem value="CUSTOM">Свой contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.propertyRegime === 'CUSTOM' && (
                <div>
                  <Label>Details contractа</Label>
                  <Textarea rows={4} value={formData.propertyAgreement} onChange={(e) => handleChange('propertyAgreement', e.target.value)} placeholder="Опишите индивидуальные terms…" />
                </div>
              )}
            </>
          )}

          {/* Step 3: Review */}
          {activeStep === 3 && (
            <>
              <h3 className="text-lg font-semibold">Verification и подача</h3>
              <div className="space-y-3">
                <div className="border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Spouseи</p>
                  <p className="font-semibold">{formData.spouse1FullName} & {formData.spouse2FullName}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Date marriageа</p>
                  <p className="font-semibold">{formData.marriageDate}</p>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Режим имущества</p>
                  <p className="font-semibold">{formData.propertyRegime}</p>
                </div>
              </div>
              <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4 text-sm">
                Byсле подачи partner должен give consent. You оба genderучите notification.
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} disabled={activeStep === 0 || loading}>
              ← Back
            </Button>
            {activeStep === STEPS.length - 1 ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Отправка…' : '📤 Bygive application'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={loading}>
                Next →
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
