'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
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
      
      // Only show certificate if marriage is registered
      if (data.status !== 'REGISTERED') {
        setError('Certificate not available. Marriage must be registered first.');
        return;
      }
      
      setMarriage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load marriage certificate');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !marriage) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => router.push('/services/zags')}
          sx={{ mb: 2 }}
        >
          Back to ZAGS
        </Button>
        <Alert severity="error">{error || 'Marriage not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => router.push('/services/zags')}
        sx={{ mb: 3 }}
        className="no-print"
      >
        Back to ZAGS
      </Button>
      
      <CertificateViewer marriage={marriage} type="MARRIAGE" />
    </Box>
  );
}
