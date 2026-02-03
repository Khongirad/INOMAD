-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CREATOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "frozenBy" TEXT,
ADD COLUMN     "isFrozen" BOOLEAN NOT NULL DEFAULT false;
