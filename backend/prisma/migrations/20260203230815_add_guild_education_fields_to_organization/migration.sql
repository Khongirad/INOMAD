-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "fieldOfStudy" TEXT,
ADD COLUMN     "requiresEducation" BOOLEAN NOT NULL DEFAULT false;
