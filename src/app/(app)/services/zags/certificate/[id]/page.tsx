'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getMarriage, type Marriage } from '@/lib/api/zags';
import CertificateViewer from '@/components/zags/CertificateViewer';

export default function MarriageCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const marriageId = params?.id as string;

  const [marriage, setMarriage] = useState<Marriage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMarriage();
  }, [marriageId]);

  const loadMarriage = async () => {
    try {
      setLoading(true);
      const data = await getMarriage(marriageId);
      if (data.status !== 'REGISTERED') {
        setError('Certificate unavailable. Marriage must be registered.');
        return;
      }
      setMarriage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !marriage) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => router.push('/services/zags')}>← Back to Civil Registry</Button>
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">
          {error || 'Marriage not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" onClick={() => router.push('/services/zags')} className="no-print">
        ← Back to Civil Registry
      </Button>
      <CertificateViewer marriage={marriage} type="MARRIAGE" />
    </div>
  );
}
