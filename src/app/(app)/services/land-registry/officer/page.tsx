'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Alert,
  Stack,
} from '@mui/material';
import {
  Map as MapIcon,
  Landscape as LandIcon,
  Home as PropertyIcon,
  Receipt as LeaseIcon,
  Gavel as TransferIcon,
} from '@mui/icons-material';

export default function LandRegistryOfficerPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          Land Registry Officer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Approve registrations, manage transfers, and maintain cadastral records
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Land Registry Officer Tools
        </Typography>
        <Typography variant="body2">
          Review and approve land plot registrations, property ownerships, lease agreements, and ownership transfers. 
          All transactions are recorded on the ALTAN blockchain for immutability.
        </Typography>
      </Alert>

      {/* Quick Actions */}
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <MapIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h6">Cadastral Map</Typography>
              <Typography variant="body2" color="text.secondary">
                View and manage all registered land plots on the interactive GIS map
              </Typography>
              <Button variant="contained" fullWidth>
                Open Map
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <LandIcon sx={{ fontSize: 40, color: 'success.main' }} />
              <Typography variant="h6">Pending Land Plots</Typography>
              <Typography variant="body2" color="text.secondary">
                Review and approve land plot registration requests
              </Typography>
              <Button variant="outlined" fullWidth>
                View Pending (0)
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <PropertyIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              <Typography variant="h6">Pending Ownerships</Typography>
              <Typography variant="body2" color="text.secondary">
                Approve ownership registrations and verify citizenship
              </Typography>
              <Button variant="outlined" fullWidth>
                View Pending (0)
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TransferIcon sx={{ fontSize: 40, color: 'error.main' }} />
              <Typography variant="h6">Pending Transfers</Typography>
              <Typography variant="body2" color="text.secondary">
                Review ownership transfer requests and payment confirmations
              </Typography>
              <Button variant="outlined" fullWidth>
                View Pending (0)
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs for different sections */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="All Records" />
          <Tab label="Land Plots" />
          <Tab label="Ownerships" />
          <Tab label="Leases" />
          <Tab label="Transfers" />
        </Tabs>
        <CardContent>
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Land Registry officer tools coming soon...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Full cadastral map integration, GIS viewer, and approval workflows will be added in the next phase.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
