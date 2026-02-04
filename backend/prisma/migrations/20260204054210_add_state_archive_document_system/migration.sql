/*
  Warnings:

  - The values [DRAFT,PENDING_SIGNATURES,PARTIALLY_SIGNED,FULLY_SIGNED,COMPLETED,CANCELLED] on the enum `DocumentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `location` on the `DocumentSignature` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `DocumentSignature` table. All the data in the column will be lost.
  - You are about to drop the column `fields` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `govtCode` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `minSignatures` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `nameEn` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `requiresWitnesses` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `template` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `DocumentTemplate` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `DocumentTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicKey` to the `DocumentSignature` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signerRole` to the `DocumentSignature` table without a default value. This is not possible if the table is not empty.
  - Made the column `ipAddress` on table `DocumentSignature` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `code` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentTemplate` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateSchema` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DocumentTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentStage" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SIGNED', 'PENDING_NOTARIZATION', 'NOTARIZED', 'PENDING_LEGAL', 'CERTIFIED', 'ARCHIVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SignerRole" AS ENUM ('CREATOR', 'CB_GOVERNOR', 'NOTARY', 'STATE_LAWYER', 'BANK_DIRECTOR', 'WITNESS', 'OFFICER');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'PRINT', 'MODIFY', 'SIGN', 'ARCHIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'ARCHIVED');
ALTER TABLE "Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DocumentContract" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "DocumentStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_templateId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_timelineEventId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentSignature" DROP CONSTRAINT "DocumentSignature_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Quest" DROP CONSTRAINT "Quest_assignmentDocId_fkey";

-- DropIndex
DROP INDEX "DocumentSignature_signedAt_idx";

-- DropIndex
DROP INDEX "DocumentTemplate_isActive_idx";

-- DropIndex
DROP INDEX "DocumentTemplate_type_idx";

-- AlterTable
ALTER TABLE "DocumentSignature" DROP COLUMN "location",
DROP COLUMN "role",
ADD COLUMN     "algorithm" TEXT NOT NULL DEFAULT 'ECDSA-secp256k1',
ADD COLUMN     "publicKey" TEXT NOT NULL,
ADD COLUMN     "signerRole" "SignerRole" NOT NULL,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "ipAddress" SET NOT NULL;

-- AlterTable
ALTER TABLE "DocumentTemplate" DROP COLUMN "fields",
DROP COLUMN "govtCode",
DROP COLUMN "isActive",
DROP COLUMN "minSignatures",
DROP COLUMN "nameEn",
DROP COLUMN "requiresWitnesses",
DROP COLUMN "scope",
DROP COLUMN "template",
DROP COLUMN "type",
ADD COLUMN     "blockchainEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "contentTemplate" TEXT NOT NULL,
ADD COLUMN     "contractTemplate" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "footerTemplate" TEXT,
ADD COLUMN     "headerTemplate" TEXT,
ADD COLUMN     "nameRu" TEXT,
ADD COLUMN     "optionalFields" TEXT[],
ADD COLUMN     "requiredFields" TEXT[],
ADD COLUMN     "requiredSignatures" TEXT[],
ADD COLUMN     "stagesRequired" TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "templateSchema" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "validationRules" JSONB,
ALTER COLUMN "version" SET DEFAULT '1.0',
ALTER COLUMN "version" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "Document";

-- CreateTable
CREATE TABLE "DocumentContract" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "registryNumber" TEXT,
    "archiveNumber" TEXT,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleRu" TEXT,
    "variables" JSONB NOT NULL,
    "generatedContent" TEXT NOT NULL,
    "attachments" JSONB,
    "issuerId" TEXT NOT NULL,
    "recipientId" TEXT,
    "currentStage" "DocumentStage" NOT NULL DEFAULT 'DRAFT',
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "blockchainTxHash" TEXT,
    "contractAddress" TEXT,
    "blockchainData" JSONB,
    "documentHash" TEXT NOT NULL,
    "hashTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStageHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fromStage" "DocumentStage",
    "toStage" "DocumentStage" NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockchainTx" TEXT,

    CONSTRAINT "DocumentStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotarizationRecord" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "notaryId" TEXT NOT NULL,
    "registryNumber" TEXT NOT NULL,
    "notes" TEXT,
    "sealImage" TEXT,
    "signature" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "notarizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotarizationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalCertification" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "opinion" TEXT NOT NULL,
    "opinionRu" TEXT,
    "compliant" BOOLEAN NOT NULL,
    "notes" TEXT,
    "signature" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AccessAction" NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentContract_documentNumber_key" ON "DocumentContract"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentContract_registryNumber_key" ON "DocumentContract"("registryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentContract_archiveNumber_key" ON "DocumentContract"("archiveNumber");

-- CreateIndex
CREATE INDEX "DocumentContract_currentStage_status_idx" ON "DocumentContract"("currentStage", "status");

-- CreateIndex
CREATE INDEX "DocumentContract_documentNumber_idx" ON "DocumentContract"("documentNumber");

-- CreateIndex
CREATE INDEX "DocumentContract_templateId_idx" ON "DocumentContract"("templateId");

-- CreateIndex
CREATE INDEX "DocumentStageHistory_documentId_timestamp_idx" ON "DocumentStageHistory"("documentId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "NotarizationRecord_documentId_key" ON "NotarizationRecord"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "NotarizationRecord_registryNumber_key" ON "NotarizationRecord"("registryNumber");

-- CreateIndex
CREATE INDEX "NotarizationRecord_notaryId_idx" ON "NotarizationRecord"("notaryId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalCertification_documentId_key" ON "LegalCertification"("documentId");

-- CreateIndex
CREATE INDEX "LegalCertification_lawyerId_idx" ON "LegalCertification"("lawyerId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentId_timestamp_idx" ON "DocumentAccessLog"("documentId", "timestamp");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_userId_idx" ON "DocumentAccessLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_code_key" ON "DocumentTemplate"("code");

-- CreateIndex
CREATE INDEX "DocumentTemplate_category_status_idx" ON "DocumentTemplate"("category", "status");

-- CreateIndex
CREATE INDEX "DocumentTemplate_code_idx" ON "DocumentTemplate"("code");

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentContract" ADD CONSTRAINT "DocumentContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentContract" ADD CONSTRAINT "DocumentContract_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentContract" ADD CONSTRAINT "DocumentContract_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentContract" ADD CONSTRAINT "DocumentContract_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentStageHistory" ADD CONSTRAINT "DocumentStageHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentStageHistory" ADD CONSTRAINT "DocumentStageHistory_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotarizationRecord" ADD CONSTRAINT "NotarizationRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotarizationRecord" ADD CONSTRAINT "NotarizationRecord_notaryId_fkey" FOREIGN KEY ("notaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCertification" ADD CONSTRAINT "LegalCertification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalCertification" ADD CONSTRAINT "LegalCertification_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
