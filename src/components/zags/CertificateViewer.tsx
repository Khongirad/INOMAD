'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Verified as VerifiedIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import type { Marriage } from '@/lib/api/zags';

interface CertificateViewerProps {
  marriage: Marriage;
  type: 'MARRIAGE' | 'DIVORCE';
}

export default function CertificateViewer({ marriage, type }: CertificateViewerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    // TODO: Implement actual PDF download
    setTimeout(() => {
      setDownloading(false);
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardContent>
        {/* Certificate Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <VerifiedIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {type === 'MARRIAGE' ? 'Marriage Certificate' : 'Divorce Certificate'}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Siberian Confederation - ZAGS
          </Typography>
          <Divider sx={{ my: 3 }} />
        </Box>

        {/* Certificate Number */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="caption" color="text.secondary">
            Certificate Number
          </Typography>
          <Typography variant="h5" fontWeight={600} color="primary.main">
            {marriage.certificateNumber}
          </Typography>
          <Chip
            label="Blockchain Verified"
            color="success"
            size="small"
            icon={<VerifiedIcon />}
            sx={{ mt: 1 }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Marriage Details */}
        <Stack spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Spouses
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {marriage.spouse1FullName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Date of Birth: {new Date(marriage.spouse1DateOfBirth).toLocaleDateString()}
            </Typography>
            <Typography variant="h6" fontWeight={600} sx={{ mt: 1 }}>
              {marriage.spouse2FullName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date of Birth: {new Date(marriage.spouse2DateOfBirth).toLocaleDateString()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Date of {type === 'MARRIAGE' ? 'Marriage' : 'Divorce'}
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {new Date(marriage.marriageDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>

          {marriage.ceremonyLocation && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Location
              </Typography>
              <Typography variant="body1">{marriage.ceremonyLocation}</Typography>
            </Box>
          )}

          {marriage.ceremonyType && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Ceremony Type
              </Typography>
              <Typography variant="body1">{marriage.ceremonyType}</Typography>
            </Box>
          )}

          {marriage.propertyRegime && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Property Regime
              </Typography>
              <Typography variant="body1">{marriage.propertyRegime}</Typography>
            </Box>
          )}

          {(marriage.witness1Name || marriage.witness2Name) && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Witnesses
              </Typography>
              {marriage.witness1Name && (
                <Typography variant="body2">1. {marriage.witness1Name}</Typography>
              )}
              {marriage.witness2Name && (
                <Typography variant="body2">2. {marriage.witness2Name}</Typography>
              )}
            </Box>
          )}

          {marriage.registeredBy && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Registered By
              </Typography>
              <Typography variant="body1">{marriage.registeredBy}</Typography>
              <Typography variant="body2" color="text.secondary">
                on {marriage.registeredAt && new Date(marriage.registeredAt).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Blockchain Info */}
        <Alert severity="success" icon={<VerifiedIcon />}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Blockchain Verified Certificate
          </Typography>
          <Typography variant="body2">
            This certificate is registered on the ALTAN blockchain, ensuring immutability and
            authenticity. The certificate hash is permanently recorded and can be verified by any
            third party.
          </Typography>
        </Alert>

        {/* QR Code Placeholder */}
        <Box sx={{ textAlign: 'center', my: 3 }}>
          <QrCodeIcon sx={{ fontSize: 120, color: 'text.secondary' }} />
          <Typography variant="caption" display="block" color="text.secondary">
            QR Code for quick verification
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={downloading}
            fullWidth
          >
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} fullWidth>
            Print
          </Button>
        </Stack>

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            This is an official certificate issued by the Civil Registry Office (ZAGS) of the
            Siberian Confederation. This document has legal validity and is registered on the ALTAN
            blockchain.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
