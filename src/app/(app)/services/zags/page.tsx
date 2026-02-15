'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  getMyMarriages,
  getPendingConsents,
  verifyCertificate,
  type Marriage,
  type MarriageConsent,
  type CivilStatus,
} from '@/lib/api/zags';
import CivilStatusBadge from '@/components/zags/CivilStatusBadge';

export default function ZAGSPage() {
  const router = useRouter();
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [pendingConsents, setPendingConsents] = useState<MarriageConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [certNumber, setCertNumber] = useState('');
  const [certResult, setCertResult] = useState<any>(null);
  const [certLoading, setCertLoading] = useState(false);

  const [civilStatus, setCivilStatus] = useState<CivilStatus>('SINGLE');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [marriagesData, consentsData] = await Promise.all([
        getMyMarriages(),
        getPendingConsents(),
      ]);
      setMarriages(marriagesData);
      setPendingConsents(consentsData);
      const activeMarriage = marriagesData.find((m) => m.status === 'REGISTERED');
      if (activeMarriage) setCivilStatus('MARRIED');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCertificate = async () => {
    if (!certNumber.trim()) return;
    try {
      setCertLoading(true);
      const result = await verifyCertificate(certNumber);
      setCertResult(result);
    } catch (err: any) {
      setCertResult({ isValid: false, error: err.message });
    } finally {
      setCertLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Civil Registry — Bureau of Civil Registration</h1>
        <p className="text-muted-foreground mt-1">
          Registration of marriages, divorces, and civil status management
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm underline">Close</button>
        </div>
      )}

      {/* Civil Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Your Civil Status</h3>
              <CivilStatusBadge status={civilStatus} />
            </div>
            {civilStatus === 'SINGLE' && (
              <Button onClick={() => router.push('/services/zags/marriage/apply')}>
                + Submit Marriage Application
              </Button>
            )}
            {civilStatus === 'MARRIED' && (
              <Button variant="destructive" onClick={() => router.push('/services/zags/divorce/apply')}>
                Submit for Divorce
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Consents */}
      {pendingConsents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Awaiting Your Consent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-500/10 text-blue-400 rounded-lg p-3 mb-4 text-sm">
              You have {pendingConsents.length} marriage application(s) awaiting your consent
            </div>
            <div className="space-y-3">
              {pendingConsents.map((consent) => (
                <div key={consent.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Marriage Application</p>
                    <p className="text-sm text-muted-foreground">
                      Filed: {new Date(consent.createdAt).toLocaleDateString('en-US')}
                    </p>
                  </div>
                  <Button onClick={() => router.push(`/services/zags/marriage/consent/${consent.marriageId}`)}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Marriages */}
      <Card>
        <CardHeader>
          <CardTitle>Marriage Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : marriages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">No marriage records found</p>
              {civilStatus === 'SINGLE' && (
                <Button variant="outline" onClick={() => router.push('/services/zags/marriage/apply')}>
                  + Submit application
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {marriages.map((marriage) => (
                <div key={marriage.id} className="border border-border rounded-lg p-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {marriage.spouse1FullName} & {marriage.spouse2FullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Marriage Date: {new Date(marriage.marriageDate).toLocaleDateString('en-US')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Certificate: {marriage.certificateNumber}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge variant={marriage.status === 'REGISTERED' ? 'default' : 'secondary'}>
                      {marriage.status === 'REGISTERED' ? 'Registered' : marriage.status}
                    </Badge>
                    {marriage.status === 'REGISTERED' && (
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/services/zags/certificate/${marriage.id}`)}
                        >
                          Certificate
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Certificate Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Verify the authenticity of a marriage or divorce certificate (public lookup)
          </p>
          <div className="flex gap-3 mb-3">
            <Input
              placeholder="MC-XXXX-XXXX or DC-XXXX-XXXX"
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCertificate()}
            />
            <Button
              onClick={handleVerifyCertificate}
              disabled={certLoading || !certNumber.trim()}
              className="min-w-[120px]"
            >
              {certLoading ? '…' : '🔍 Verify'}
            </Button>
          </div>

          {certResult && (
            <div className={`rounded-lg p-4 ${certResult.isValid ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {certResult.isValid ? (
                <>
                  <p className="font-semibold">✅ Valid Certificate ({certResult.type})</p>
                  {certResult.details && (
                    <>
                      <p className="text-sm">Spouses: {certResult.details.spouse1Name} & {certResult.details.spouse2Name}</p>
                      <p className="text-sm">Marriage Date: {new Date(certResult.details.marriageDate).toLocaleDateString('en-US')}</p>
                    </>
                  )}
                  <p className="text-xs opacity-70">Issued: {new Date(certResult.issuedDate).toLocaleDateString('en-US')}</p>
                </>
              ) : (
                <p>{certResult.error || 'Certificate not found or invalid'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>📋 Marriage Requirements</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Both partners must be 18+ years old</li>
              <li>• Both must be single</li>
              <li>• Mutual consent required</li>
              <li>• Verification and approval by Civil Registry officer</li>
              <li>• Certificates on blockchain</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>⚖️ Divorce Process</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Online application submission</li>
              <li>• Property division agreement (optional)</li>
              <li>• Review by Civil Registry officer</li>
              <li>• Certificate upon completion</li>
              <li>• Status updated automatically</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
