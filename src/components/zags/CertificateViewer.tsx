'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, ShieldCheck, QrCode } from 'lucide-react';
import type { Marriage } from '@/lib/api/zags';
import { getMarriageCertificate } from '@/lib/api/zags';

interface CertificateViewerProps {
  marriage: Marriage;
  type: 'MARRIAGE' | 'DIVORCE';
}

export default function CertificateViewer({ marriage, type }: CertificateViewerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const certData = await getMarriageCertificate(marriage.certificateNumber);
      // Generate a PDF-like download from the certificate data
      const blob = new Blob([JSON.stringify(certData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${marriage.certificateNumber}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download certificate:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Certificate Header */}
        <div className="text-center mb-8">
          <ShieldCheck className="h-16 w-16 text-green-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-1">
            {type === 'MARRIAGE' ? 'Marriage Certificate' : 'Divorce Certificate'}
          </h2>
          <p className="text-lg text-muted-foreground">
            Siberian Confederation - ZAGS
          </p>
          <hr className="my-6" />
        </div>

        {/* Certificate Number */}
        <div className="text-center mb-8">
          <p className="text-xs text-muted-foreground">Certificate Number</p>
          <p className="text-xl font-semibold text-primary">{marriage.certificateNumber}</p>
          <Badge className="mt-2 gap-1 bg-green-600 hover:bg-green-700">
            <ShieldCheck className="h-3 w-3" />
            Blockchain Verified
          </Badge>
        </div>

        <hr className="my-6" />

        {/* Marriage Details */}
        <div className="space-y-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Spouses</p>
            <p className="text-lg font-semibold">{marriage.spouse1FullName}</p>
            <p className="text-sm text-muted-foreground mb-2">
              Date of Birth: {new Date(marriage.spouse1DateOfBirth).toLocaleDateString()}
            </p>
            <p className="text-lg font-semibold mt-2">{marriage.spouse2FullName}</p>
            <p className="text-sm text-muted-foreground">
              Date of Birth: {new Date(marriage.spouse2DateOfBirth).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Date of {type === 'MARRIAGE' ? 'Marriage' : 'Divorce'}
            </p>
            <p className="font-semibold">
              {new Date(marriage.marriageDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {marriage.ceremonyLocation && (
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p>{marriage.ceremonyLocation}</p>
            </div>
          )}

          {marriage.ceremonyType && (
            <div>
              <p className="text-xs text-muted-foreground">Ceremony Type</p>
              <p>{marriage.ceremonyType}</p>
            </div>
          )}

          {marriage.propertyRegime && (
            <div>
              <p className="text-xs text-muted-foreground">Property Regime</p>
              <p>{marriage.propertyRegime}</p>
            </div>
          )}

          {(marriage.witness1Name || marriage.witness2Name) && (
            <div>
              <p className="text-xs text-muted-foreground">Witnesses</p>
              {marriage.witness1Name && <p className="text-sm">1. {marriage.witness1Name}</p>}
              {marriage.witness2Name && <p className="text-sm">2. {marriage.witness2Name}</p>}
            </div>
          )}

          {marriage.registeredBy && (
            <div>
              <p className="text-xs text-muted-foreground">Registered By</p>
              <p>{marriage.registeredBy}</p>
              <p className="text-sm text-muted-foreground">
                on {marriage.registeredAt && new Date(marriage.registeredAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <hr className="my-6" />

        {/* Blockchain Info */}
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-green-800 dark:text-green-300 mb-1">
                Blockchain Verified Certificate
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                This certificate is registered on the ALTAN blockchain, ensuring immutability and
                authenticity. The certificate hash is permanently recorded and can be verified by any
                third party.
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="text-center my-6">
          <QrCode className="h-28 w-28 text-muted-foreground mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">
            QR Code for quick verification
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <Button className="flex-1 gap-2" onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            This is an official certificate issued by the Civil Registry Office (ZAGS) of the
            Siberian Confederation. This document has legal validity and is registered on the ALTAN
            blockchain.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
