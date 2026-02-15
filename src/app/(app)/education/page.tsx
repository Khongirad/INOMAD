'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SubmitEducationForm } from '@/components/education/SubmitEducationForm';
import { EducationList } from '@/components/education/EducationList';
import { PendingVerificationCard } from '@/components/education/PendingVerificationCard';
import { GraduationCap, Plus, BookOpen, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EducationPage() {
  const [educations, setEducations] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eduRes, verRes] = await Promise.all([
        fetch('/api/education/mine', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/education/pending-verifications', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (eduRes.ok) {
        const data = await eduRes.json();
        setEducations(data.data || data || []);
      }

      if (verRes && verRes.ok) {
        const data = await verRes.json();
        setPendingVerifications(data.data || data || []);
        setIsAdmin(true);
      }
    } catch {
      toast.error('Error загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (formData: any) => {
    const res = await fetch('/api/education/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error('Error при отправке');
    toast.success('Education sent на проверку');
    setShowForm(false);
    fetchData();
  };

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/education/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed');
    toast.success('Education confirmed');
    fetchData();
  };

  const handleReject = async (id: string, reason: string) => {
    const res = await fetch(`/api/education/${id}/reject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed');
    toast.success('Education rejected');
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Education</h1>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <SubmitEducationForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <Tabs defaultValue="my-education">
        <TabsList className="mb-6">
          <TabsTrigger value="my-education" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Моё Education
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="verification" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Verification
              {pendingVerifications.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full h-5 min-w-[20px] inline-flex items-center justify-center px-1">
                  {pendingVerifications.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-education">
          <EducationList educations={educations} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="verification">
            {pendingVerifications.length === 0 ? (
              <div className="text-center py-16">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No заявок на верификацию</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingVerifications.map((v) => (
                  <PendingVerificationCard
                    key={v.id}
                    verification={v}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
