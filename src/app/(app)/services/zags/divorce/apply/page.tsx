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

const STEPS = ['Select Marriage', 'Divorce Reasons', 'Property Division', 'Verification and Submission'];

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
      toast.error(err.message || 'Failed to load data');
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
      toast.success('Divorce application submitted');
      router.push('/services/zags');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
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
          ← Back to Civil Registry
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">💔</span>
          <div>
            <h1 className="text-2xl font-bold">Filing for Divorce</h1>
            <p className="text-muted-foreground">File an application for marriage dissolution</p>
          </div>
        </div>
      </div>

      {marriages.length === 0 ? (
        <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4">
          You have no registered marriages. Divorce is only possible for registered marriages.
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
                  <h3 className="text-lg font-semibold">Select marriage for dissolution</h3>
                  <Select value={selectedMarriageId} onValueChange={setSelectedMarriageId}>
                    <SelectTrigger><SelectValue placeholder="Select marriage" /></SelectTrigger>
                    <SelectContent>
                      {marriages.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.spouse1FullName} & {m.spouse2FullName} — {new Date(m.marriageDate).toLocaleDateString('en-US')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMarriage && (
                    <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4 text-sm space-y-1">
                      <p className="font-semibold">Selected marriage</p>
                      <p><strong>Spouses:</strong> {selectedMarriage.spouse1FullName} & {selectedMarriage.spouse2FullName}</p>
                      <p><strong>Date:</strong> {new Date(selectedMarriage.marriageDate).toLocaleDateString('en-US')}</p>
                      <p><strong>Property Regime:</strong> {selectedMarriage.propertyRegime || 'Not specified'}</p>
                    </div>
                  )}
                </>
              )}

              {/* Step 1 */}
              {activeStep === 1 && (
                <>
                  <h3 className="text-lg font-semibold">Divorce Reasons</h3>
                  <div>
                    <Label>Reason for Divorce *</Label>
                    <Textarea rows={6} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the reasons in detail…" />
                    <p className="text-xs text-muted-foreground mt-1">This information will be reviewed by a Civil Registry officer</p>
                  </div>
                  <div className="bg-yellow-500/10 text-yellow-400 rounded-lg p-4 text-sm">
                    <p className="font-semibold">⚠️ Important Notice</p>
                    <p>Filing for divorce is a serious legal action. Your spouse will be notified.</p>
                  </div>
                </>
              )}

              {/* Step 2 */}
              {activeStep === 2 && (
                <>
                  <h3 className="text-lg font-semibold">Property Division (optional)</h3>
                  {selectedMarriage?.propertyRegime && (
                    <div className="bg-blue-500/10 text-blue-400 rounded-lg p-4 text-sm">
                      <p><strong>Current regime:</strong> {selectedMarriage.propertyRegime}</p>
                      {selectedMarriage.propertyAgreement && (
                        <p><strong>Contract:</strong> {selectedMarriage.propertyAgreement}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label>Proposed Property Division</Label>
                    <Textarea rows={6} value={propertyDivision} onChange={(e) => setPropertyDivision(e.target.value)} placeholder="Describe how you propose to divide joint property…" />
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
                      <p className="text-sm text-muted-foreground">Reason</p>
                      <p>{reason}</p>
                    </div>
                    {propertyDivision && (
                      <div className="border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Property Division</p>
                        <p>{propertyDivision}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                    <p className="font-semibold">⚠️ Confirmation</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>All provided information is correct</li>
                      <li>You understand that this will start the divorce process</li>
                      <li>Your spouse will be officially notified</li>
                      <li>This action is difficult to reverse</li>
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
                    {submitting ? 'Submitting…' : '📤 Submit Application'}
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
