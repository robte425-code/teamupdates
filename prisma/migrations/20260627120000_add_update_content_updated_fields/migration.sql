-- AlterTable
ALTER TABLE "Update" ADD COLUMN "contentUpdatedAt" TIMESTAMP(3),
ADD COLUMN "updatedByName" TEXT,
ADD COLUMN "updatedByEmail" TEXT;
