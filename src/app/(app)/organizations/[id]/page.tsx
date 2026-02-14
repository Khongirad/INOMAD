'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RateOrganizationDialog } from '@/components/organizations/RateOrganizationDialog';
import {
  Building2,
  Users,
  Star,
  MapPin,
  Calendar,
  ArrowLeft,
  Crown,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  location?: string;
  leader?: { id: string; fullName: string; seatId: string };
  memberCount: number;
  rating: number;
  ratingCount: number;
  financialRating?: number;
  trustRating?: number;
  qualityRating?: number;
  parentOrganization?: { id: string; name: string };
  childOrganizations?: { id: string; name: string; type: string; memberCount: number }[];
  members?: { id: string; fullName: string; role: string; seatId: string }[];
  createdAt: string;
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setOrg(data);
    } catch {
      toast.error('Ошибка загрузки организации');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrg();
  }, [id]);

  const handleRate = async (data: { financialScore: number; trustScore: number; qualityScore: number }) => {
    const res = await fetch(`/api/organizations/${id}/rate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed');
    toast.success('Оценка отправлена');
    fetchOrg();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">Организация не найдена</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{org.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{org.type}</Badge>
                {org.location && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {org.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button onClick={() => setRateDialogOpen(true)} className="gap-2">
            <Star className="h-4 w-4" />
            Оценить
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{org.rating?.toFixed(1) || '—'}</p>
            <p className="text-xs text-muted-foreground">{org.ratingCount || 0} оценок</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{org.memberCount || 0}</p>
            <p className="text-xs text-muted-foreground">участников</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{org.financialRating?.toFixed(1) || '—'}</p>
            <p className="text-xs text-muted-foreground">финансы</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <ShieldCheck className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{org.trustRating?.toFixed(1) || '—'}</p>
            <p className="text-xs text-muted-foreground">доверие</p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {org.description && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">О организации</h3>
            <p className="text-sm text-muted-foreground">{org.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Leader */}
      {org.leader && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Руководитель
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                <Crown className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">{org.leader.fullName}</p>
                <p className="text-sm text-muted-foreground">{org.leader.seatId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      {org.members && org.members.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Участники ({org.members.length})
            </h3>
            <div className="space-y-2">
              {org.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {member.fullName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.seatId}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{member.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent Organization */}
      {org.parentOrganization && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Вышестоящая организация</h3>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push(`/organizations/${org.parentOrganization!.id}`)}
            >
              <Building2 className="h-4 w-4" />
              {org.parentOrganization.name}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Child Organizations */}
      {org.childOrganizations && org.childOrganizations.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Дочерние организации ({org.childOrganizations.length})</h3>
            <div className="space-y-2">
              {org.childOrganizations.map((child) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/organizations/${child.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{child.name}</p>
                      <p className="text-xs text-muted-foreground">{child.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {child.memberCount}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created date */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
          <Calendar className="h-3.5 w-3.5" />
          Создана: {new Date(org.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Rate Dialog */}
      <RateOrganizationDialog
        open={rateDialogOpen}
        onClose={() => setRateDialogOpen(false)}
        organizationName={org.name}
        organizationId={org.id}
        onSubmit={handleRate}
      />
    </div>
  );
}
