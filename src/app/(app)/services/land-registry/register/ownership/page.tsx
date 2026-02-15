'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { registerOwnership } from '@/lib/api/land-registry';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, Home, Loader2, Info, AlertTriangle } from 'lucide-react';

const STEPS = ['Election участка', 'Ownership Details', 'Verification and Submission'];
const OWNERSHIP_TYPES = ['FULL', 'PARTIAL', 'JOINT', 'USUFRUCT'];

export default function PropertyOwnershipRegistrationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isCitizen] = useState(true);

  const [landPlotId, setLandPlotId] = useState('');
  const [ownershipType, setOwnershipType] = useState('FULL');
  const [ownershipShare, setOwnershipShare] = useState('100');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionMethod, setAcquisitionMethod] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleNext = () => setActiveStep((p) => p + 1);
  const handleBack = () => setActiveStep((p) => p - 1);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await registerOwnership({ landPlotId, ownershipType: ownershipType as any, sharePercentage: parseFloat(ownershipShare) });
      toast.success('Right собственности registeredо!');
      router.push('/services/land-registry');
    } catch (err: any) {
      toast.error(err.message || 'Registration error');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return landPlotId !== '';
    if (activeStep === 1) return ownershipType && ownershipShare && acquisitionDate && acquisitionMethod;
    return true;
  };

  if (!isCitizen) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4">
          Only citizens могут регистрировать right собственности.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/land-registry')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div className="flex items-center gap-3">
          <Home className="h-10 w-10 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Registration property rights</h1>
            <p className="text-muted-foreground mt-1">Зарегистрируйте right на земельный plot</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">Registration связывает вас с registeredным участком.</p>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= activeStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                  <span className="text-xs mt-1 text-center max-w-[100px]">{label}</span>
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
              <h3 className="text-lg font-semibold">Election земельного участка</h3><hr />
              <div className="space-y-2">
                <Label>ID участка or cadastral number</Label>
                <Input placeholder="Enter ID" value={landPlotId} onChange={(e) => setLandPlotId(e.target.value)} />
                <p className="text-xs text-muted-foreground">Plot должен быть in кадастровой systemе</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm"><strong>Note:</strong> Search участкоin будет добавлен позже.</p>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ownership Details</h3><hr />
              <div className="space-y-2">
                <Label>Ownership Type</Label>
                <Select value={ownershipType} onValueChange={setOwnershipType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OWNERSHIP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Share (%)</Label>
                <Input type="number" value={ownershipShare} onChange={(e) => setOwnershipShare(e.target.value)} disabled={ownershipType === 'FULL'} />
              </div>
              <div className="space-y-2">
                <Label>Date приобретения</Label>
                <Input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Способ приобретения</Label>
                <Input placeholder="Byкупка, Наследование, Gift..." value={acquisitionMethod} onChange={(e) => setAcquisitionMethod(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Price (ALTAN) — optional</Label>
                <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Registration Verification</h3><hr />
              <div><p className="text-xs text-muted-foreground">Plot</p><p className="font-semibold">{landPlotId}</p></div>
              <div><p className="text-xs text-muted-foreground">Type</p><Badge>{ownershipType}</Badge></div>
              <div><p className="text-xs text-muted-foreground">Share</p><p>{ownershipShare}%</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Приобретение</p>
                <p className="text-sm">Способ: {acquisitionMethod}</p>
                <p className="text-sm">Date: {acquisitionDate ? new Date(acquisitionDate).toLocaleDateString('en-US') : '—'}</p>
                {purchasePrice && <p className="text-sm">Price: {purchasePrice} ALTAN</p>}
              </div>
              {notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{notes}</p></div>}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">The record will be added to the ALTAN blockchain.</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} disabled={activeStep === 0}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            {activeStep === STEPS.length - 1 ? (
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={!canProceed() || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {submitting ? 'Registration...' : 'Submit'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>Next<ArrowRight className="h-4 w-4 ml-2" /></Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
