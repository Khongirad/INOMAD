-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('MIGRATION_OFFICER', 'LAW_ENFORCEMENT', 'COURT_WARRANT', 'APPLICANT');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IDENTITY_CARD', 'BIRTH_CERTIFICATE', 'RESIDENCE_PROOF', 'PHOTO', 'BIOMETRIC_DATA', 'OTHER');

-- CreateTable
CREATE TABLE "PassportApplication" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "nationality" TEXT NOT NULL DEFAULT 'Siberian Confederation',
    "biography" TEXT NOT NULL,
    "currentAddress" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passportNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "PassportApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "encryptedPath" TEXT NOT NULL,
    "encryptionKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warrant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "warrantNumber" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "judgeName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),

    CONSTRAINT "Warrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessorId" TEXT NOT NULL,
    "accessorRole" "AccessRole" NOT NULL,
    "applicationId" TEXT,
    "action" TEXT NOT NULL,
    "warrantId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedFields" TEXT[],

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankVerification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationRef" TEXT,
    "processedBy" TEXT,

    CONSTRAINT "BankVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassportApplication_userId_key" ON "PassportApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PassportApplication_passportNumber_key" ON "PassportApplication"("passportNumber");

-- CreateIndex
CREATE INDEX "PassportApplication_userId_idx" ON "PassportApplication"("userId");

-- CreateIndex
CREATE INDEX "PassportApplication_passportNumber_idx" ON "PassportApplication"("passportNumber");

-- CreateIndex
CREATE INDEX "PassportApplication_fullName_idx" ON "PassportApplication"("fullName");

-- CreateIndex
CREATE INDEX "PassportApplication_status_idx" ON "PassportApplication"("status");

-- CreateIndex
CREATE INDEX "PassportApplication_issueDate_idx" ON "PassportApplication"("issueDate");

-- CreateIndex
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "Warrant_warrantNumber_key" ON "Warrant"("warrantNumber");

-- CreateIndex
CREATE INDEX "Warrant_targetUserId_idx" ON "Warrant"("targetUserId");

-- CreateIndex
CREATE INDEX "Warrant_requestedBy_idx" ON "Warrant"("requestedBy");

-- CreateIndex
CREATE INDEX "Warrant_status_idx" ON "Warrant"("status");

-- CreateIndex
CREATE INDEX "Warrant_validUntil_idx" ON "Warrant"("validUntil");

-- CreateIndex
CREATE INDEX "AccessLog_accessorId_idx" ON "AccessLog"("accessorId");

-- CreateIndex
CREATE INDEX "AccessLog_applicationId_idx" ON "AccessLog"("applicationId");

-- CreateIndex
CREATE INDEX "AccessLog_timestamp_idx" ON "AccessLog"("timestamp");

-- CreateIndex
CREATE INDEX "AccessLog_accessorRole_idx" ON "AccessLog"("accessorRole");

-- CreateIndex
CREATE INDEX "BankVerification_userId_idx" ON "BankVerification"("userId");

-- CreateIndex
CREATE INDEX "BankVerification_bankCode_idx" ON "BankVerification"("bankCode");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PassportApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PassportApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
