-- CreateEnum
CREATE TYPE "CentralBankRole" AS ENUM ('GOVERNOR', 'BOARD_MEMBER');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "EmissionType" AS ENUM ('MINT', 'BURN');

-- CreateTable
CREATE TABLE "CentralBankOfficer" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "role" "CentralBankRole" NOT NULL,
    "name" TEXT,
    "appointedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CentralBankOfficer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentralBankLicense" (
    "id" TEXT NOT NULL,
    "bankAddress" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "txHash" TEXT,
    "issuedById" TEXT,

    CONSTRAINT "CentralBankLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrAccount" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "accountRef" TEXT NOT NULL,
    "balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionRecord" (
    "id" TEXT NOT NULL,
    "type" "EmissionType" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "reason" TEXT NOT NULL,
    "memo" TEXT,
    "corrAccountId" TEXT,
    "authorizedById" TEXT,
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetaryPolicy" (
    "id" TEXT NOT NULL,
    "officialRate" DECIMAL(10,4) NOT NULL,
    "reserveRequirement" DECIMAL(10,4) NOT NULL,
    "dailyEmissionLimit" DECIMAL(18,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonetaryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetaryPolicyChange" (
    "id" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT,
    "authorizedById" TEXT,
    "txHash" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonetaryPolicyChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CentralBankOfficer_walletAddress_key" ON "CentralBankOfficer"("walletAddress");

-- CreateIndex
CREATE INDEX "CentralBankOfficer_walletAddress_idx" ON "CentralBankOfficer"("walletAddress");

-- CreateIndex
CREATE INDEX "CentralBankOfficer_role_idx" ON "CentralBankOfficer"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CentralBankLicense_bankAddress_key" ON "CentralBankLicense"("bankAddress");

-- CreateIndex
CREATE UNIQUE INDEX "CentralBankLicense_bankCode_key" ON "CentralBankLicense"("bankCode");

-- CreateIndex
CREATE INDEX "CentralBankLicense_bankCode_idx" ON "CentralBankLicense"("bankCode");

-- CreateIndex
CREATE INDEX "CentralBankLicense_status_idx" ON "CentralBankLicense"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CorrAccount_licenseId_key" ON "CorrAccount"("licenseId");

-- CreateIndex
CREATE UNIQUE INDEX "CorrAccount_accountRef_key" ON "CorrAccount"("accountRef");

-- CreateIndex
CREATE INDEX "CorrAccount_accountRef_idx" ON "CorrAccount"("accountRef");

-- CreateIndex
CREATE INDEX "EmissionRecord_type_idx" ON "EmissionRecord"("type");

-- CreateIndex
CREATE INDEX "EmissionRecord_corrAccountId_idx" ON "EmissionRecord"("corrAccountId");

-- CreateIndex
CREATE INDEX "EmissionRecord_createdAt_idx" ON "EmissionRecord"("createdAt");

-- CreateIndex
CREATE INDEX "MonetaryPolicy_isActive_idx" ON "MonetaryPolicy"("isActive");

-- CreateIndex
CREATE INDEX "MonetaryPolicyChange_parameter_idx" ON "MonetaryPolicyChange"("parameter");

-- CreateIndex
CREATE INDEX "MonetaryPolicyChange_effectiveAt_idx" ON "MonetaryPolicyChange"("effectiveAt");

-- AddForeignKey
ALTER TABLE "CentralBankLicense" ADD CONSTRAINT "CentralBankLicense_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "CentralBankOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrAccount" ADD CONSTRAINT "CorrAccount_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "CentralBankLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionRecord" ADD CONSTRAINT "EmissionRecord_corrAccountId_fkey" FOREIGN KEY ("corrAccountId") REFERENCES "CorrAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionRecord" ADD CONSTRAINT "EmissionRecord_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "CentralBankOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonetaryPolicyChange" ADD CONSTRAINT "MonetaryPolicyChange_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "CentralBankOfficer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
