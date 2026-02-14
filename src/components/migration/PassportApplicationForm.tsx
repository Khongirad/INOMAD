'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, Loader2 } from 'lucide-react';
import { uploadPassportDocument, type Document } from '@/lib/api/migration';
import { toast } from 'sonner';

interface PassportApplicationFormProps {
  step: number;
  formData: any;
  onChange: (data: any) => void;
  applicationId: string | null;
}

export default function PassportApplicationForm({
  step,
  formData,
  onChange,
  applicationId,
}: PassportApplicationFormProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field: string, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  const handleFileUpload = async (type: 'PHOTO' | 'SIGNATURE' | 'BIRTH_CERTIFICATE', file: File) => {
    if (!applicationId) {
      toast.error('Application not created yet');
      return;
    }

    try {
      setUploading(true);
      const doc = await uploadPassportDocument(applicationId, file, type);
      setDocuments((prev) => [...prev, doc]);
      toast.success('Document uploaded successfully (encrypted)');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // Step 0: Personal Information
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Personal Information</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your basic personal details as they appear on your birth certificate
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="As it appears on birth certificate"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Sex *</Label>
            <Select
              value={formData.sex}
              onValueChange={(v) => handleChange('sex', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="O">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality}
              disabled
              placeholder="Citizens only can apply"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              value={formData.height || ''}
              onChange={(e) => handleChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eyeColor">Eye Color</Label>
            <Input
              id="eyeColor"
              value={formData.eyeColor}
              onChange={(e) => handleChange('eyeColor', e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="previousPassport">Previous Passport Number</Label>
            <Input
              id="previousPassport"
              value={formData.previousPassportNumber}
              onChange={(e) => handleChange('previousPassportNumber', e.target.value)}
              placeholder="If renewing"
            />
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Biographical Data
  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Biographical Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Additional information for passport records
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="placeOfBirth">Place of Birth *</Label>
            <Input
              id="placeOfBirth"
              value={formData.placeOfBirth}
              onChange={(e) => handleChange('placeOfBirth', e.target.value)}
              placeholder="City, Region"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fatherName">Father's Name</Label>
            <Input
              id="fatherName"
              value={formData.fatherName}
              onChange={(e) => handleChange('fatherName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motherName">Mother's Name</Label>
            <Input
              id="motherName"
              value={formData.motherName}
              onChange={(e) => handleChange('motherName', e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Current Address *</Label>
            <textarea
              id="address"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region *</Label>
            <Input
              id="region"
              value={formData.region}
              onChange={(e) => handleChange('region', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Document Upload
  if (step === 2) {
    const hasPhoto = documents.some((d) => d.type === 'PHOTO');
    const hasSignature = documents.some((d) => d.type === 'SIGNATURE');
    const hasBirthCert = documents.some((d) => d.type === 'BIRTH_CERTIFICATE');

    const UploadCard = ({
      title,
      description,
      accept,
      hasDoc,
      docType,
    }: {
      title: string;
      description: string;
      accept: string;
      hasDoc: boolean;
      docType: 'PHOTO' | 'SIGNATURE' | 'BIRTH_CERTIFICATE';
    }) => (
      <Card className="border">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-1 flex items-center gap-2">
            {title}
            {hasDoc && <CheckCircle className="h-4 w-4 text-green-500" />}
          </h4>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <label className={`flex items-center justify-center gap-2 w-full h-10 px-4 rounded-md text-sm cursor-pointer transition-colors ${
            hasDoc
              ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {hasDoc ? 'Replace' : 'Upload'}
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(docType, file);
              }}
            />
          </label>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Document Upload</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload required documents. All files are encrypted with AES-256-GCM
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UploadCard title="Passport Photo" description="Recent color photo, 600x600px min" accept="image/*" hasDoc={hasPhoto} docType="PHOTO" />
          <UploadCard title="Signature" description="Scan or photo of your signature" accept="image/*" hasDoc={hasSignature} docType="SIGNATURE" />
          <UploadCard title="Birth Certificate" description="Scan of original certificate" accept="image/*,application/pdf" hasDoc={hasBirthCert} docType="BIRTH_CERTIFICATE" />
        </div>

        {!hasPhoto || !hasSignature || !hasBirthCert ? (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ Please upload all required documents to proceed
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
            ✅ All required documents uploaded successfully
          </div>
        )}
      </div>
    );
  }

  // Step 3: Review & Confirm
  if (step === 3) {
    const ReviewField = ({ label, value }: { label: string; value: string }) => (
      <Card className="border">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className="font-medium">{value}</p>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Review & Confirm</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please review all information before submitting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReviewField label="Full Name" value={formData.fullName} />
          <ReviewField label="Date of Birth" value={formData.dateOfBirth} />
          <ReviewField label="Place of Birth" value={formData.placeOfBirth} />
          <ReviewField label="Nationality" value={formData.nationality} />
          <div className="md:col-span-2">
            <ReviewField label="Address" value={`${formData.address}, ${formData.city}, ${formData.region}`} />
          </div>
          <div className="md:col-span-2">
            <Card className="border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Documents Uploaded</p>
                <div className="text-sm space-y-0.5">
                  <p>✅ Passport Photo</p>
                  <p>✅ Signature</p>
                  <p>✅ Birth Certificate</p>
                  <p className="text-xs text-muted-foreground mt-1">(All documents encrypted)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
          ℹ️ By submitting this application, you confirm that all information provided is accurate and truthful.
          False information may result in application rejection or legal consequences.
        </div>
      </div>
    );
  }

  return null;
}
