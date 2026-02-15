'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMyPassportApplications, lookupPassport, type PassportApplication } from '@/lib/api/migration';
import ApplicationStatusCard from '@/components/migration/ApplicationStatusCard';

export default function MigrationServicePage() {
  const router = useRouter();
  const [applications, setApplications] = useState<PassportApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lookupNumber, setLookupNumber] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getMyPassportApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupNumber.trim()) return;
    try {
      setLookupLoading(true);
      const result = await lookupPassport(lookupNumber);
      setLookupResult(result);
    } catch (err: any) {
      setLookupResult({ exists: false, error: err.message });
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Migration Service</h1>
        <p className="text-muted-foreground mt-1">
          Оформление passportов, governance applicationsми и verification documentов
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm underline">Close</button>
        </div>
      )}

      {/* Passport Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>📘 Standard passport</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              For citizens. Valid 10 лет. Betweenpeopleные поездки во all страны-partnerы.
            </p>
            <Button className="w-full" onClick={() => router.push('/services/migration/apply?type=STANDARD')}>
              + Submit application
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🎖️ Diplomatic passport</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              For гос. служащих и diplomaатов. Особые привилегии и иммунитеты.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Required номинация
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🛂 Official passport</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              For служащих in командировках за рубежом.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Required авторизация
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Applications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Yourи applications</CardTitle>
            <Button onClick={() => router.push('/services/migration/apply')}>
              + New application
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">You ещё не подавали заявлений</p>
              <Button variant="outline" onClick={() => router.push('/services/migration/apply')}>
                + Submit на passport
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <ApplicationStatusCard
                  key={app.id}
                  application={app}
                  onClick={() => router.push(`/services/migration/applications/${app.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passport Lookup */}
      <Card>
        <CardHeader>
          <CardTitle>Verification passportа</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Проверьте действительность passportа (публичный поclaim)
          </p>
          <div className="flex gap-3 mb-3">
            <Input
              placeholder="SC-XXXX-XXXX"
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
            <Button
              onClick={handleLookup}
              disabled={lookupLoading || !lookupNumber.trim()}
              className="min-w-[120px]"
            >
              {lookupLoading ? '…' : '🔍 Проверить'}
            </Button>
          </div>

          {lookupResult && (
            <div className={`rounded-lg p-4 ${lookupResult.exists ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {lookupResult.exists ? (
                <>
                  <p className="font-semibold">✅ Valid padisputeт</p>
                  <p className="text-sm">Owner: {lookupResult.fullName}</p>
                  {lookupResult.expiresAt && (
                    <p className="text-sm">Истекает: {new Date(lookupResult.expiresAt).toLocaleDateString('en-US')}</p>
                  )}
                </>
              ) : (
                <p>{lookupResult.error || 'Паdisputeт не найден or недействителен'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
