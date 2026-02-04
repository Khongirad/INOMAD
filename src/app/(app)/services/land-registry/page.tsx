'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Map as MapIcon,
  Home as PropertyIcon,
  Description as DocumentIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { getMyOwnerships, getMyLeases, type Ownership, type Lease } from '@/lib/api/land-registry';

export default function LandRegistryPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [ownerships, setOwnerships] = useState<Ownership[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user citizenship status
  const [isCitizen, setIsCitizen] = useState(true);

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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Land Registry & Cadastral Service
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Property ownership, land registration, and cadastral mapping
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => router.push('/services/land-registry/map')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MapIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Cadastral Map</Typography>
              <Typography variant="body2" color="text.secondary">
                View interactive map
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card 
            sx={{ cursor: isCitizen ? 'pointer' : 'not-allowed', opacity: isCitizen ? 1 : 0.6, '&:hover': isCitizen ? { boxShadow: 3 } : {} }}
            onClick={() => isCitizen && router.push('/services/land-registry/register/land-plot')}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <LocationIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Register Land</Typography>
              <Typography variant="body2" color="text.secondary">
                {isCitizen ? 'Register new plot' : 'Citizens only'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card 
            sx={{ cursor: isCitizen ? 'pointer' : 'not-allowed', opacity: isCitizen ? 1 : 0.6, '&:hover': isCitizen ? { boxShadow: 3 } : {} }}
            onClick={() => isCitizen && router.push('/services/land-registry/register/ownership')}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <PropertyIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">Register Ownership</Typography>
              <Typography variant="body2" color="text.secondary">
                {isCitizen ? 'Claim ownership' : 'Citizens only'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => router.push('/services/land-registry/register/lease')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <DocumentIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">Register Lease</Typography>
              <Typography variant="body2" color="text.secondary">
                Lease property
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Property/Lease Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label={`Your Properties (${ownerships.length})`} />
            <Tab label={`Your Leases (${leases.length})`} />
          </Tabs>
        </Box>

        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Ownerships Tab */}
              {tab === 0 && (
                <>
                  {ownerships.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        You don't own any properties yet
                      </Typography>
                      {isCitizen && (
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          sx={{ mt: 2 }}
                          onClick={() => router.push('/services/land-registry/register/ownership')}
                        >
                          Register Ownership
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {ownerships.map((ownership) => (
                        <Card key={ownership.id} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="h6" gutterBottom>
                                  {ownership.ownerName}'s Property
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Certificate: {ownership.certificateNumber}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Ownership: {ownership.ownershipType} ({ownership.sharePercentage}%)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Issued: {new Date(ownership.issuedAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Chip
                                  label={ownership.isActive ? 'Active' : 'Inactive'}
                                  color={ownership.isActive ? 'success' : 'default'}
                                  size="small"
                                  sx={{ mb: 1 }}
                                />
                                <Box>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => router.push(`/services/land-registry/properties/${ownership.id}`)}
                                  >
                                    View Details
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </>
              )}

              {/* Leases Tab */}
              {tab === 1 && (
                <>
                  {leases.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        You don't have any active leases
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        sx={{ mt: 2 }}
                        onClick={() => router.push('/services/land-registry/register/lease')}
                      >
                        Register Lease
                      </Button>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {leases.map((lease) => (
                        <Card key={lease.id} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="h6" gutterBottom>
                                  {lease.leaseType} Lease
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Lessee: {lease.lesseeName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Rent: {lease.monthlyRent} {lease.currency}/month
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Chip
                                label={lease.isActive ? 'Active' : 'Expired'}
                                color={lease.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🏛️ Ownership Rules
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Only citizens can own land and property<br />
                • Foreigners can only lease (not own)<br />
                • All co-owners must be citizens<br />
                • Citizenship verified automatically<br />
                • Blockchain-backed certificates
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔄 Property Transfers
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Initiate transfer online<br />
                • Buyer confirms payment via blockchain<br />
                • Registry officer completes transfer<br />
                • New certificate issued automatically<br />
                • Full transaction history logged
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
