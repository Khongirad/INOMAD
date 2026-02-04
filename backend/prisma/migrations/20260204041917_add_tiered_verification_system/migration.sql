-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('UNVERIFIED', 'ARBAN_VERIFIED', 'ZUN_VERIFIED', 'FULLY_VERIFIED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "arbanVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "fullyVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "totalEmitted" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verificationLevelSetAt" TIMESTAMP(3),
ADD COLUMN     "verificationLevelSetBy" TEXT,
ADD COLUMN     "zunVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requestedLevel" "VerificationLevel" NOT NULL,
    "justification" TEXT NOT NULL,
    "supportingDocuments" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArbanMutualVerification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arbanId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verifiedId" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArbanMutualVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequest_requesterId_idx" ON "VerificationRequest"("requesterId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_createdAt_idx" ON "VerificationRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ArbanMutualVerification_arbanId_idx" ON "ArbanMutualVerification"("arbanId");

-- CreateIndex
CREATE INDEX "ArbanMutualVerification_verifierId_idx" ON "ArbanMutualVerification"("verifierId");

-- CreateIndex
CREATE INDEX "ArbanMutualVerification_verifiedId_idx" ON "ArbanMutualVerification"("verifiedId");

-- CreateIndex
CREATE UNIQUE INDEX "ArbanMutualVerification_arbanId_verifierId_verifiedId_key" ON "ArbanMutualVerification"("arbanId", "verifierId", "verifiedId");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbanMutualVerification" ADD CONSTRAINT "ArbanMutualVerification_arbanId_fkey" FOREIGN KEY ("arbanId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbanMutualVerification" ADD CONSTRAINT "ArbanMutualVerification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbanMutualVerification" ADD CONSTRAINT "ArbanMutualVerification_verifiedId_fkey" FOREIGN KEY ("verifiedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
