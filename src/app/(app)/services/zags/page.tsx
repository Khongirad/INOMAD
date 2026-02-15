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
        <h1 className="text-2xl font-bold">Civil Registry — Bureau citizensской регистрации</h1>
        <p className="text-muted-foreground mt-1">
          Registration marriageа, divorce и governance citizensским статусом
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
              <h3 className="text-lg font-semibold mb-2">Your citizensский статус</h3>
              <CivilStatusBadge status={civilStatus} />
            </div>
            {civilStatus === 'SINGLE' && (
              <Button onClick={() => router.push('/services/zags/marriage/apply')}>
                + Bygive application на marriage
              </Button>
            )}
            {civilStatus === 'MARRIED' && (
              <Button variant="destructive" onClick={() => router.push('/services/zags/divorce/apply')}>
                Bygive на divorce
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Consents */}
      {pendingConsents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ожидают yourего согласия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-500/10 text-blue-400 rounded-lg p-3 mb-4 text-sm">
              У вас {pendingConsents.length} application(й) на marriage, ожидающих yourего согласия
            </div>
            <div className="space-y-3">
              {pendingConsents.map((consent) => (
                <div key={consent.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Application на marriage</p>
                    <p className="text-sm text-muted-foreground">
                      Filed: {new Date(consent.createdAt).toLocaleDateString('ru-RU')}
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
          <CardTitle>Записи о marriageе</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : marriages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">Записи о marriageе не найдены</p>
              {civilStatus === 'SINGLE' && (
                <Button variant="outline" onClick={() => router.push('/services/zags/marriage/apply')}>
                  + Bygive application
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
                      Date marriageа: {new Date(marriage.marriageDate).toLocaleDateString('ru-RU')}
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
          <CardTitle>Verification witnessства</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Проверьте подлинность witnessства о marriageе or divorceе (публичный поclaim)
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
              {certLoading ? '…' : '🔍 Проверить'}
            </Button>
          </div>

          {certResult && (
            <div className={`rounded-lg p-4 ${certResult.isValid ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {certResult.isValid ? (
                <>
                  <p className="font-semibold">✅ Действительное certificate ({certResult.type})</p>
                  {certResult.details && (
                    <>
                      <p className="text-sm">Spouseи: {certResult.details.spouse1Name} & {certResult.details.spouse2Name}</p>
                      <p className="text-sm">Date marriageа: {new Date(certResult.details.marriageDate).toLocaleDateString('ru-RU')}</p>
                    </>
                  )}
                  <p className="text-xs opacity-70">Выдано: {new Date(certResult.issuedDate).toLocaleDateString('ru-RU')}</p>
                </>
              ) : (
                <p>{certResult.error || 'Certificate не найдено or недействительно'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>📋 Requirements к marriageу</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Обоим partnerм должно быть 18+ лет</li>
              <li>• Оба должны быть холосты</li>
              <li>• Required обоюдное consent</li>
              <li>• Verification и одобрение сотрудником Civil Registry</li>
              <li>• Witnessства на блокчейне</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>⚖️ Process divorceа</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Byдача applications онлайн</li>
              <li>• Agreement о разделе имущества (опционально)</li>
              <li>• Рассмотрение сотрудником Civil Registry</li>
              <li>• Certificate после завершения</li>
              <li>• Status обновляется автоматически</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
