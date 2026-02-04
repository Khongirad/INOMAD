-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "MarriageStatus" AS ENUM ('PENDING_CONSENT', 'PENDING_REVIEW', 'APPROVED', 'REGISTERED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DivorceStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'FINALIZED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Marriage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "spouse1Id" TEXT NOT NULL,
    "spouse2Id" TEXT NOT NULL,
    "spouse1FullName" TEXT NOT NULL,
    "spouse2FullName" TEXT NOT NULL,
    "spouse1DateOfBirth" TIMESTAMP(3) NOT NULL,
    "spouse2DateOfBirth" TIMESTAMP(3) NOT NULL,
    "marriageDate" TIMESTAMP(3) NOT NULL,
    "ceremonyLocation" TEXT,
    "ceremonyType" TEXT,
    "witness1Name" TEXT,
    "witness2Name" TEXT,
    "witness1Id" TEXT,
    "witness2Id" TEXT,
    "propertyRegime" TEXT,
    "propertyAgreement" TEXT,
    "status" "MarriageStatus" NOT NULL DEFAULT 'PENDING_CONSENT',
    "registeredBy" TEXT,
    "registeredAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarriageConsent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marriageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "consentedAt" TIMESTAMP(3),
    "signature" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "MarriageConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Divorce" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "marriageId" TEXT NOT NULL,
    "divorceCertificateNumber" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DivorceStatus" NOT NULL DEFAULT 'FILED',
    "finalizedDate" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "propertyDivision" TEXT,

    CONSTRAINT "Divorce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameChange" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "oldName" TEXT NOT NULL,
    "newName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "certificateNumber" TEXT,
    "effectiveDate" TIMESTAMP(3),

    CONSTRAINT "NameChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicRegistry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateNumber" TEXT NOT NULL,
    "certificateType" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PublicRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_certificateNumber_key" ON "Marriage"("certificateNumber");

-- CreateIndex
CREATE INDEX "Marriage_spouse1Id_idx" ON "Marriage"("spouse1Id");

-- CreateIndex
CREATE INDEX "Marriage_spouse2Id_idx" ON "Marriage"("spouse2Id");

-- CreateIndex
CREATE INDEX "Marriage_certificateNumber_idx" ON "Marriage"("certificateNumber");

-- CreateIndex
CREATE INDEX "Marriage_marriageDate_idx" ON "Marriage"("marriageDate");

-- CreateIndex
CREATE INDEX "Marriage_status_idx" ON "Marriage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_spouse1Id_spouse2Id_key" ON "Marriage"("spouse1Id", "spouse2Id");

-- CreateIndex
CREATE INDEX "MarriageConsent_marriageId_idx" ON "MarriageConsent"("marriageId");

-- CreateIndex
CREATE INDEX "MarriageConsent_userId_idx" ON "MarriageConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarriageConsent_marriageId_userId_key" ON "MarriageConsent"("marriageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Divorce_marriageId_key" ON "Divorce"("marriageId");

-- CreateIndex
CREATE UNIQUE INDEX "Divorce_divorceCertificateNumber_key" ON "Divorce"("divorceCertificateNumber");

-- CreateIndex
CREATE INDEX "Divorce_marriageId_idx" ON "Divorce"("marriageId");

-- CreateIndex
CREATE INDEX "Divorce_initiatedBy_idx" ON "Divorce"("initiatedBy");

-- CreateIndex
CREATE INDEX "Divorce_status_idx" ON "Divorce"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NameChange_certificateNumber_key" ON "NameChange"("certificateNumber");

-- CreateIndex
CREATE INDEX "NameChange_userId_idx" ON "NameChange"("userId");

-- CreateIndex
CREATE INDEX "NameChange_certificateNumber_idx" ON "NameChange"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PublicRegistry_certificateNumber_key" ON "PublicRegistry"("certificateNumber");

-- CreateIndex
CREATE INDEX "PublicRegistry_certificateNumber_idx" ON "PublicRegistry"("certificateNumber");

-- CreateIndex
CREATE INDEX "PublicRegistry_certificateType_idx" ON "PublicRegistry"("certificateType");

-- AddForeignKey
ALTER TABLE "MarriageConsent" ADD CONSTRAINT "MarriageConsent_marriageId_fkey" FOREIGN KEY ("marriageId") REFERENCES "Marriage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Divorce" ADD CONSTRAINT "Divorce_marriageId_fkey" FOREIGN KEY ("marriageId") REFERENCES "Marriage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
