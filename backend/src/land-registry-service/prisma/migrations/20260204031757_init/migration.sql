-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'AGRICULTURAL', 'INDUSTRIAL', 'MIXED_USE', 'VACANT_LAND');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('FULL_OWNERSHIP', 'SHARED_OWNERSHIP');

-- CreateEnum
CREATE TYPE "LeaseType" AS ENUM ('RESIDENTIAL_LEASE', 'COMMERCIAL_LEASE', 'AGRICULTURAL_LEASE', 'LONG_TERM_LEASE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INITIAL_REGISTRATION', 'SALE', 'INHERITANCE', 'GIFT', 'COURT_ORDER', 'MORTGAGE_REGISTRATION', 'MORTGAGE_RELEASE', 'LEASE_REGISTRATION', 'LEASE_TERMINATION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'VERIFIED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "LandPlot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cadastralNumber" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "addressLine" TEXT,
    "boundaries" JSONB NOT NULL,
    "centerLat" DECIMAL(10,7) NOT NULL,
    "centerLon" DECIMAL(10,7) NOT NULL,
    "area" DECIMAL(12,2) NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "permittedUse" TEXT[],
    "restrictions" TEXT[],
    "assessedValue" DECIMAL(18,2),
    "lastValuationDate" TIMESTAMP(3),
    "registeredDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT NOT NULL,

    CONSTRAINT "LandPlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landPlotId" TEXT NOT NULL,
    "propertyNumber" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "buildingType" TEXT,
    "floorNumber" INTEGER,
    "totalFloors" INTEGER,
    "roomCount" INTEGER,
    "totalArea" DECIMAL(10,2),
    "yearBuilt" INTEGER,
    "constructionMaterial" TEXT,
    "assessedValue" DECIMAL(18,2),
    "lastValuationDate" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ownership" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landPlotId" TEXT,
    "propertyId" TEXT,
    "ownerId" TEXT NOT NULL,
    "isCitizenVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "ownershipType" "OwnershipType" NOT NULL,
    "ownershipShare" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "isJointOwnership" BOOLEAN NOT NULL DEFAULT false,
    "jointOwnerIds" TEXT[],
    "acquisitionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateNumber" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landPlotId" TEXT,
    "propertyId" TEXT,
    "transactionType" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "sellerId" TEXT,
    "buyerId" TEXT,
    "transactionAmount" DECIMAL(18,2),
    "paymentTxHash" TEXT,
    "contractHash" TEXT,
    "documents" TEXT[],
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blockchainTxHash" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encumbrance" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landPlotId" TEXT,
    "propertyId" TEXT,
    "encumbranceType" TEXT NOT NULL,
    "creditorName" TEXT NOT NULL,
    "creditorId" TEXT,
    "debtorId" TEXT NOT NULL,
    "principalAmount" DECIMAL(18,2),
    "interestRate" DECIMAL(5,2),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "releasedAt" TIMESTAMP(3),
    "releasedBy" TEXT,
    "documentHash" TEXT,

    CONSTRAINT "Encumbrance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landPlotId" TEXT,
    "propertyId" TEXT,
    "lessorId" TEXT NOT NULL,
    "lesseeId" TEXT NOT NULL,
    "isForeignLessee" BOOLEAN NOT NULL DEFAULT false,
    "leaseType" "LeaseType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAutoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalTermMonths" INTEGER,
    "monthlyRent" DECIMAL(18,2) NOT NULL,
    "depositAmount" DECIMAL(18,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "lastPayment" TIMESTAMP(3),
    "nextPayment" TIMESTAMP(3),
    "terms" TEXT NOT NULL,
    "restrictions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "terminatedAt" TIMESTAMP(3),
    "terminatedBy" TEXT,
    "terminationReason" TEXT,
    "registeredBy" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseNumber" TEXT NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicCadastralIndex" (
    "id" TEXT NOT NULL,
    "cadastralNumber" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "approximateLocation" TEXT NOT NULL,
    "hasActiveOwnership" BOOLEAN NOT NULL DEFAULT true,
    "hasEncumbrances" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PublicCadastralIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LandPlot_cadastralNumber_key" ON "LandPlot"("cadastralNumber");

-- CreateIndex
CREATE INDEX "LandPlot_cadastralNumber_idx" ON "LandPlot"("cadastralNumber");

-- CreateIndex
CREATE INDEX "LandPlot_region_district_idx" ON "LandPlot"("region", "district");

-- CreateIndex
CREATE INDEX "LandPlot_propertyType_idx" ON "LandPlot"("propertyType");

-- CreateIndex
CREATE UNIQUE INDEX "Property_propertyNumber_key" ON "Property"("propertyNumber");

-- CreateIndex
CREATE INDEX "Property_landPlotId_idx" ON "Property"("landPlotId");

-- CreateIndex
CREATE INDEX "Property_propertyNumber_idx" ON "Property"("propertyNumber");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE UNIQUE INDEX "Ownership_certificateNumber_key" ON "Ownership"("certificateNumber");

-- CreateIndex
CREATE INDEX "Ownership_ownerId_idx" ON "Ownership"("ownerId");

-- CreateIndex
CREATE INDEX "Ownership_landPlotId_idx" ON "Ownership"("landPlotId");

-- CreateIndex
CREATE INDEX "Ownership_propertyId_idx" ON "Ownership"("propertyId");

-- CreateIndex
CREATE INDEX "Ownership_isActive_idx" ON "Ownership"("isActive");

-- CreateIndex
CREATE INDEX "Ownership_isCitizenVerified_idx" ON "Ownership"("isCitizenVerified");

-- CreateIndex
CREATE INDEX "Transaction_landPlotId_idx" ON "Transaction"("landPlotId");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_idx" ON "Transaction"("propertyId");

-- CreateIndex
CREATE INDEX "Transaction_sellerId_idx" ON "Transaction"("sellerId");

-- CreateIndex
CREATE INDEX "Transaction_buyerId_idx" ON "Transaction"("buyerId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Encumbrance_landPlotId_idx" ON "Encumbrance"("landPlotId");

-- CreateIndex
CREATE INDEX "Encumbrance_propertyId_idx" ON "Encumbrance"("propertyId");

-- CreateIndex
CREATE INDEX "Encumbrance_debtorId_idx" ON "Encumbrance"("debtorId");

-- CreateIndex
CREATE INDEX "Encumbrance_creditorId_idx" ON "Encumbrance"("creditorId");

-- CreateIndex
CREATE INDEX "Encumbrance_isActive_idx" ON "Encumbrance"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Lease_leaseNumber_key" ON "Lease"("leaseNumber");

-- CreateIndex
CREATE INDEX "Lease_lessorId_idx" ON "Lease"("lessorId");

-- CreateIndex
CREATE INDEX "Lease_lesseeId_idx" ON "Lease"("lesseeId");

-- CreateIndex
CREATE INDEX "Lease_landPlotId_idx" ON "Lease"("landPlotId");

-- CreateIndex
CREATE INDEX "Lease_propertyId_idx" ON "Lease"("propertyId");

-- CreateIndex
CREATE INDEX "Lease_status_idx" ON "Lease"("status");

-- CreateIndex
CREATE INDEX "Lease_isForeignLessee_idx" ON "Lease"("isForeignLessee");

-- CreateIndex
CREATE INDEX "Lease_endDate_idx" ON "Lease"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "PublicCadastralIndex_cadastralNumber_key" ON "PublicCadastralIndex"("cadastralNumber");

-- CreateIndex
CREATE INDEX "PublicCadastralIndex_cadastralNumber_idx" ON "PublicCadastralIndex"("cadastralNumber");

-- CreateIndex
CREATE INDEX "PublicCadastralIndex_region_district_idx" ON "PublicCadastralIndex"("region", "district");

-- CreateIndex
CREATE INDEX "PublicCadastralIndex_propertyType_idx" ON "PublicCadastralIndex"("propertyType");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landPlotId_fkey" FOREIGN KEY ("landPlotId") REFERENCES "LandPlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_landPlotId_fkey" FOREIGN KEY ("landPlotId") REFERENCES "LandPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ownership" ADD CONSTRAINT "Ownership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_landPlotId_fkey" FOREIGN KEY ("landPlotId") REFERENCES "LandPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encumbrance" ADD CONSTRAINT "Encumbrance_landPlotId_fkey" FOREIGN KEY ("landPlotId") REFERENCES "LandPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encumbrance" ADD CONSTRAINT "Encumbrance_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_landPlotId_fkey" FOREIGN KEY ("landPlotId") REFERENCES "LandPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
