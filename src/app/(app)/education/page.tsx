'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab, Button, Alert } from '@mui/material';
import { SubmitEducationForm, EducationFormData } from '@/components/education/SubmitEducationForm';
import { EducationList } from '@/components/education/EducationList';
import { PendingVerificationCard } from '@/components/education/PendingVerificationCard';
import { Plus } from 'lucide-react';
import { getMyEducations, getPendingEducations, submitEducation, verifyEducation, rejectEducation } from '@/lib/api';
import { toast } from 'sonner';

export default function EducationPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [myEducations, setMyEducations] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get user role to determine if admin
  const isAdmin = false;

  useEffect(() => {
    fetchMyEducations();
    if (isAdmin) {
      fetchPendingVerifications();
    }
  }, []);

  const fetchMyEducations = async () => {
    try {
      const data = await getMyEducations();
      setMyEducations(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch educations';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const data = await getPendingEducations();
      setPendingVerifications(data);
    } catch (err: any) {
      console.error('Failed to fetch pending:', err);
      toast.error('Failed to load pending verifications');
    }
  };

  const handleSubmitEducation = async (data: EducationFormData) => {
    try {
      await submitEducation(data as unknown as Parameters<typeof submitEducation>[0]);
      toast.success('Education submitted for verification!');
      
      // Refresh list
      await fetchMyEducations();
      setShowSubmitForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit education');
      throw err;
    }
  };

  const handleApproveVerification = async (id: string, validForGuilds?: string[]) => {
    try {
      await verifyEducation(id);
      toast.success('Education approved!');
      
      // Refresh list
      await fetchPendingVerifications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve verification');
    }
  };

  const handleRejectVerification = async (id: string) => {
    try {
      await rejectEducation(id, 'Rejected by admin');
      toast.warning('Education rejected');
      
      // Refresh list
      await fetchPendingVerifications();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject verification');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Образование
      </Typography>

      {isAdmin && (
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
          <Tab label="Мое Образование" />
          <Tab
            label={`На Проверке (${pendingVerifications.length})`}
            disabled={!isAdmin}
          />
        </Tabs>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tab 0: My Educations */}
      {currentTab === 0 && (
        <Box>
          {showSubmitForm ? (
            <SubmitEducationForm
              onSubmit={handleSubmitEducation}
              onCancel={() => setShowSubmitForm(false)}
            />
          ) : (
            <EducationList
              educations={myEducations}
              onAddNew={() => setShowSubmitForm(true)}
            />
          )}
        </Box>
      )}

      {/* Tab 1: Pending Verifications (Admin Only) */}
      {currentTab === 1 && isAdmin && (
        <Box>
          {pendingVerifications.length === 0 ? (
            <Alert severity="info">Нет заявок на проверку</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pendingVerifications.map((verification) => (
                <PendingVerificationCard
                  key={verification.id}
                  verification={verification}
                  onApprove={handleApproveVerification}
                  onReject={handleRejectVerification}
                />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}
