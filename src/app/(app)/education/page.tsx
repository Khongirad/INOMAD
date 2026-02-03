'use client';

import { useState, useEffect } from 'react';
import { Container, Typography, Box, Tabs, Tab, Button, Alert } from '@mui/material';
import { SubmitEducationForm, EducationFormData } from '@/components/education/SubmitEducationForm';
import { EducationList } from '@/components/education/EducationList';
import { PendingVerificationCard } from '@/components/education/PendingVerificationCard';
import { Plus } from 'lucide-react';

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
      const response = await fetch('/api/education/my', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch educations');

      const data = await response.json();
      setMyEducations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      const response = await fetch('/api/education/pending', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch pending verifications');

      const data = await response.json();
      setPendingVerifications(data);
    } catch (err: any) {
      console.error('Failed to fetch pending:', err);
    }
  };

  const handleSubmitEducation = async (data: EducationFormData) => {
    try {
      const response = await fetch('/api/education/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit');
      }

      // Refresh list
      await fetchMyEducations();
      setShowSubmitForm(false);
    } catch (err: any) {
      throw err;
    }
  };

  const handleApproveVerification = async (id: string, validForGuilds?: string[]) => {
    try {
      const response = await fetch(`/api/education/verify/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ validForGuilds }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      // Refresh list
      await fetchPendingVerifications();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
    }
  };

  const handleRejectVerification = async (id: string) => {
    try {
      const response = await fetch(`/api/education/reject/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to reject');

      // Refresh list
      await fetchPendingVerifications();
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
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
