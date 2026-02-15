'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllPassportApplications, type PassportApplication } from '@/lib/api/migration';
import { Eye, CheckCircle, XCircle, Clock, BarChart3, Loader2 } from 'lucide-react';

export default function MigrationOfficerPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<PassportApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await getAllPassportApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getFiltered = (filter: string) => {
    if (filter === 'ALL') return applications;
    if (filter === 'PROCESSED') return applications.filter((a) => ['APPROVED', 'REJECTED', 'ISSUED'].includes(a.status));
    return applications.filter((a) => a.status === filter);
  };

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'SUBMITTED').length,
    underReview: applications.filter((a) => a.status === 'UNDER_REVIEW').length,
    approved: applications.filter((a) => a.status === 'APPROVED').length,
    issued: applications.filter((a) => a.status === 'ISSUED').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="secondary">Filed</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Under Review</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'ISSUED':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Выдано</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderTable = (apps: PassportApplication[]) => (
    <div className="overflow-x-auto">
      {apps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Applications не найдены
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Applicant</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type passportа</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date подачи</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-medium text-sm">{app.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    Д.Р.: {new Date(app.dateOfBirth).toLocaleDateString('ru-RU')}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline">{app.passportType}</Badge>
                </td>
                <td className="py-3 px-4 text-sm">
                  {new Date(app.createdAt).toLocaleString('ru-RU')}
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(app.status)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/services/migration/officer/review/${app.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {app.status === 'SUBMITTED' && (
                      <>
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Панель officer миграции</h1>
        <p className="text-muted-foreground mt-1">Рассмотрение и обworkка заявлений на passport</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-destructive hover:opacity-70">✕</button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total заявлений</p>
              </div>
              <BarChart3 className="h-10 w-10 text-primary opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Awaiting Review</p>
              </div>
              <Clock className="h-10 w-10 text-blue-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-yellow-600">{stats.underReview}</p>
                <p className="text-sm text-muted-foreground">Under Review</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.approved + stats.issued}</p>
                <p className="text-sm text-muted-foreground">Approved / Выдано</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Table */}
      <Tabs defaultValue="ALL" onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="ALL">All applications</TabsTrigger>
          <TabsTrigger value="SUBMITTED">Ожидают</TabsTrigger>
          <TabsTrigger value="UNDER_REVIEW">Under Review</TabsTrigger>
          <TabsTrigger value="PROCESSED">Обworkанные</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="ALL" className="mt-0">{renderTable(getFiltered('ALL'))}</TabsContent>
                <TabsContent value="SUBMITTED" className="mt-0">{renderTable(getFiltered('SUBMITTED'))}</TabsContent>
                <TabsContent value="UNDER_REVIEW" className="mt-0">{renderTable(getFiltered('UNDER_REVIEW'))}</TabsContent>
                <TabsContent value="PROCESSED" className="mt-0">{renderTable(getFiltered('PROCESSED'))}</TabsContent>
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
