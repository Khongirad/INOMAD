'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllMarriages, type Marriage } from '@/lib/api/zags';

export default function ZAGSOfficerPage() {
  const router = useRouter();
  const [tab, setTab] = useState('all');
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarriages();
  }, []);

  const loadMarriages = async () => {
    try {
      setLoading(true);
      const data = await getAllMarriages();
      setMarriages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marriages');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: marriages.length,
    pendingReview: marriages.filter((m) => m.status === 'PENDING_REVIEW').length,
    approved: marriages.filter((m) => m.status === 'APPROVED').length,
    registered: marriages.filter((m) => m.status === 'REGISTERED').length,
  };

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'REGISTERED': case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredMarriages =
    tab === 'all' ? marriages
    : tab === 'pending' ? marriages.filter((m) => m.status === 'PENDING_REVIEW')
    : tab === 'approved' ? marriages.filter((m) => m.status === 'APPROVED' || m.status === 'REGISTERED')
    : marriages.filter((m) => m.status === 'REJECTED' || m.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Панель сотрудника Civil Registry</h1>
        <p className="text-muted-foreground mt-1">Рассмотрение и одобрение registrations marriageа</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-sm underline">Close</button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total заявлений</p>
              </div>
              <span className="text-4xl opacity-30">💍</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-yellow-500">{stats.pendingReview}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
              </div>
              <span className="text-4xl opacity-30">⏳</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-500">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
              <span className="text-4xl opacity-30">✅</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-500">{stats.registered}</p>
                <p className="text-sm text-muted-foreground">Registeredо</p>
              </div>
              <span className="text-4xl opacity-30">📜</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table with Tabs */}
      <Card>
        <Tabs defaultValue="all" value={tab} onValueChange={setTab}>
          <div className="border-b border-border px-4 pt-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Under Review</TabsTrigger>
              <TabsTrigger value="approved">Approved/Зарег.</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </div>
          <CardContent className="pt-4">
            <h3 className="text-lg font-semibold mb-3">Applications на marriage</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredMarriages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Applications не найдены</div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Spouses</th>
                      <th className="text-left p-3 font-medium">Marriage Date</th>
                      <th className="text-left p-3 font-medium">Ceremony Type</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Certificate</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarriages.map((marriage) => (
                      <tr key={marriage.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold">{marriage.spouse1FullName}</p>
                          <p className="text-muted-foreground">{marriage.spouse2FullName}</p>
                        </td>
                        <td className="p-3">{new Date(marriage.marriageDate).toLocaleDateString('ru-RU')}</td>
                        <td className="p-3">
                          <Badge variant="outline">{marriage.ceremonyType || 'Citizenский'}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={statusVariant(marriage.status)}>{marriage.status}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {marriage.certificateNumber || 'Не выдано'}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/services/zags/officer/review/${marriage.id}`)}
                          >
                            👁️ Просмотр
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
