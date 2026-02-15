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
import { registerLandPlot } from '@/lib/api/land-registry';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Send, Mountain, Loader2, Info, AlertTriangle } from 'lucide-react';

const STEPS = ['Basic Information', 'Location and Size', 'Ownership Details', 'Verification and Submission'];
const LAND_USE_TYPES = ['AGRICULTURAL', 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'FOREST', 'RECREATIONAL', 'CONSERVATION', 'MIXED_USE'];

export default function LandRegistrationPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isCitizen] = useState(true);

  const [cadastralNumber, setCadastralNumber] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('');
  const [landUseType, setLandUseType] = useState('');
  const [area, setArea] = useState('');
  const [coordinates, setCoordinates] = useState('');
  const [boundaries, setBoundaries] = useState('');
  const [ownershipType, setOwnershipType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [ownershipShare, setOwnershipShare] = useState('100');
  const [documents, setDocuments] = useState('');

  const handleNext = () => setActiveStep((p) => p + 1);
  const handleBack = () => setActiveStep((p) => p - 1);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await registerLandPlot({ cadastralNumber, address, region, landUseType, area: parseFloat(area), coordinates, boundaries } as any);
      toast.success('Land Plot registered!');
      router.push('/services/land-registry');
    } catch (err: any) {
      toast.error(err.message || 'Registration error');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return cadastralNumber && address && region && landUseType;
    if (activeStep === 1) return area && coordinates;
    if (activeStep === 2) return ownershipType && ownershipShare;
    return true;
  };

  if (!isCitizen) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <Button variant="ghost" onClick={() => router.push('/services/land-registry')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-4">
          <p className="font-semibold">Required citizenship</p>
          <p className="text-sm">Only citizens of the Siberian Confederation may register land plots. Foreigners may apply for a lease.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/services/land-registry')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Registry
        </Button>
        <div className="flex items-center gap-3">
          <Mountain className="h-10 w-10 text-green-500" />
          <div>
            <h1 className="text-3xl font-bold">Land Plot Registration</h1>
            <p className="text-muted-foreground mt-1">Register a new plot in the cadastral registry</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-2">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Only for citizens</p>
          <p className="text-sm text-muted-foreground">All registrations are recorded on the ALTAN blockchain.</p>
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
              <h3 className="text-lg font-semibold">Basic Information</h3><hr />
              <div className="space-y-2">
                <Label>Cadastral number</Label>
                <Input placeholder="54:35:123456:78" value={cadastralNumber} onChange={(e) => setCadastralNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="Address or description" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input placeholder="Irkutsk Oblast, Buryatia..." value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Land Use Type</Label>
                <Select value={landUseType} onValueChange={setLandUseType}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{LAND_USE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location and Size</h3><hr />
              <div className="space-y-2">
                <Label>Area (ha)</Label>
                <Input type="number" placeholder="2.5" value={area} onChange={(e) => setArea(e.target.value)} step="0.01" min="0" />
              </div>
              <div className="space-y-2">
                <Label>GPS-coordinates</Label>
                <Input placeholder="52.2897° N, 104.2806° E" value={coordinates} onChange={(e) => setCoordinates(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Border Description (optional)</Label>
                <Textarea placeholder="Describe borders..." value={boundaries} onChange={(e) => setBoundaries(e.target.value)} rows={4} />
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground"><strong>GIS coming soon:</strong> Interactive border drawing map will be available in the next update.</p>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ownership Details</h3><hr />
              <div className="space-y-2">
                <Label>Ownership Type</Label>
                <Select value={ownershipType} onValueChange={(v) => setOwnershipType(v as 'FULL' | 'PARTIAL')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Full (100%)</SelectItem>
                    <SelectItem value="PARTIAL">Proportional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Share (%)</Label>
                <Input type="number" value={ownershipShare} onChange={(e) => setOwnershipShare(e.target.value)} disabled={ownershipType === 'FULL'} />
                <p className="text-xs text-muted-foreground">{ownershipType === 'FULL' ? 'Full = 100%' : 'Enter your share'}</p>
              </div>
              <div className="space-y-2">
                <Label>Supporting Documents (optional)</Label>
                <Textarea placeholder="List documents..." value={documents} onChange={(e) => setDocuments(e.target.value)} rows={3} />
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm"><strong>Note:</strong> Registration will be verified by a cadastral officer.</p>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Registration Verification</h3><hr />
              <div><p className="text-xs text-muted-foreground">Cadastral number</p><p className="font-semibold">{cadastralNumber}</p></div>
              <div><p className="text-xs text-muted-foreground">Address / Region</p><p>{address}</p><p className="text-sm text-muted-foreground">{region}</p></div>
              <div><p className="text-xs text-muted-foreground">Type of Use</p><Badge>{landUseType.replace(/_/g, ' ')}</Badge></div>
              <div><p className="text-xs text-muted-foreground">Area</p><p>{area} ha</p><p className="text-sm text-muted-foreground">GPS: {coordinates}</p></div>
              {boundaries && <div><p className="text-xs text-muted-foreground">Borders</p><p className="text-sm">{boundaries}</p></div>}
              <div><p className="text-xs text-muted-foreground">Ownership</p><p>{ownershipType === 'FULL' ? 'Full' : `Proportional (${ownershipShare}%)`}</p></div>
              {documents && <div><p className="text-xs text-muted-foreground">Documents</p><p className="text-sm">{documents}</p></div>}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm font-semibold mb-1">Confirmation</p>
                <p className="text-sm text-muted-foreground">By submitting this application, you confirm that:</p>
                <ul className="text-sm text-muted-foreground list-disc ml-4 mt-1 space-y-1">
                  <li>All information is accurate and reliable</li>
                  <li>You have legal rights to this plot</li>
                  <li>Registration will be verified by a cadastral officer.</li>
                  <li>The record will be added to the ALTAN blockchain</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleBack} disabled={activeStep === 0}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
            {activeStep === STEPS.length - 1 ? (
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={!canProceed() || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {submitting ? 'Registration...' : 'Submit Application'}
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
