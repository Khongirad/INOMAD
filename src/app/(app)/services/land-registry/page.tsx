'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMyOwnerships, getMyLeases, type Ownership, type Lease } from '@/lib/api/land-registry';

export default function LandRegistryPage() {
  const router = useRouter();
  const [tab, setTab] = useState('ownerships');
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCitizen] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ownershipsData, leasesData] = await Promise.all([
        getMyOwnerships(),
        getMyLeases(),
      ]);
      setOwnerships(ownershipsData);
      setLeases(leasesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Land Cadastre и registry</h1>
        <p className="text-muted-foreground mt-1">
          Ownership, registration земли и кадастровая map
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm underline">Close</button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push('/services/land-registry/map')}>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <h3 className="font-semibold">Cadastral Map</h3>
            <p className="text-xs text-muted-foreground mt-1">Interactive map</p>
          </CardContent>
        </Card>
        <Card
          className={`transition-colors ${isCitizen ? 'cursor-pointer hover:border-primary/50' : 'opacity-50 cursor-not-allowed'}`}
          onClick={() => isCitizen && router.push('/services/land-registry/register/land')}
        >
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-2">📍</div>
            <h3 className="font-semibold">Register plot</h3>
            <p className="text-xs text-muted-foreground mt-1">{isCitizen ? 'New plot' : 'Only for citizens'}</p>
          </CardContent>
        </Card>
        <Card
          className={`transition-colors ${isCitizen ? 'cursor-pointer hover:border-primary/50' : 'opacity-50 cursor-not-allowed'}`}
          onClick={() => isCitizen && router.push('/services/land-registry/register/ownership')}
        >
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-2">🏠</div>
            <h3 className="font-semibold">Оформить ownership</h3>
            <p className="text-xs text-muted-foreground mt-1">{isCitizen ? 'Заявить right' : 'Only for citizens'}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push('/services/land-registry/register/lease')}>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-2">📄</div>
            <h3 className="font-semibold">Оформить аренду</h3>
            <p className="text-xs text-muted-foreground mt-1">Lease properties</p>
          </CardContent>
        </Card>
      </div>

      {/* Properties / Leases */}
      <Card>
        <Tabs defaultValue="ownerships" value={tab} onValueChange={setTab}>
          <div className="border-b border-border px-4 pt-4">
            <TabsList>
              <TabsTrigger value="ownerships">Yourа ownership ({ownerships.length})</TabsTrigger>
              <TabsTrigger value="leases">Yourи аренды ({leases.length})</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="ownerships" className="mt-0">
                  {ownerships.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-3">У вас no registeredной собственности</p>
                      {isCitizen && (
                        <Button variant="outline" onClick={() => router.push('/services/land-registry/register/ownership')}>
                          + Оформить ownership
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ownerships.map((ownership) => (
                        <div key={ownership.id} className="border border-border rounded-lg p-4 flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{ownership.ownerName}</p>
                            <p className="text-sm text-muted-foreground">
                              Certificate: {ownership.certificateNumber}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Type: {ownership.ownershipType} ({ownership.sharePercentage}%)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Выдано: {new Date(ownership.issuedAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <div className="text-right space-y-2">
                            <Badge variant={ownership.isActive ? 'default' : 'secondary'}>
                              {ownership.isActive ? 'Activа' : 'Неактивна'}
                            </Badge>
                            <div>
                              <Button size="sm" variant="outline" onClick={() => router.push(`/services/land-registry/properties/${ownership.id}`)}>
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="leases" className="mt-0">
                  {leases.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-3">No активных аренд</p>
                      <Button variant="outline" onClick={() => router.push('/services/land-registry/register/lease')}>
                        + Оформить аренду
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leases.map((lease) => (
                        <div key={lease.id} className="border border-border rounded-lg p-4 flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{lease.leaseType} lease</p>
                            <p className="text-sm text-muted-foreground">Leaseтор: {lease.lesseeName}</p>
                            <p className="text-sm text-muted-foreground">
                              Плата: {lease.monthlyRent} {lease.currency}/мес
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(lease.startDate).toLocaleDateString('ru-RU')} — {new Date(lease.endDate).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <Badge variant={lease.isActive ? 'default' : 'secondary'}>
                            {lease.isActive ? 'Activа' : 'Истекла'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>🏛️ Правила собственности</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Only citizens могут владеть землёй</li>
              <li>• Foreigners могут only арендовать</li>
              <li>• All совладельцы должны быть citizenми</li>
              <li>• Citizenship проверяется автоматически</li>
              <li>• Witnessства на blockchain</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>🔄 Ownership Transfer</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Инициация transfers онлайн</li>
              <li>• Byкупатель подтверждает оплату через blockchain</li>
              <li>• Регистратор завершает передачу</li>
              <li>• New certificate выдаётся автоматически</li>
              <li>• Full history транзакций</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
