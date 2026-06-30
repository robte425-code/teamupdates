-- AlterTable
ALTER TABLE "Update" ADD COLUMN "showUpdatedPill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedPillDays" INTEGER NOT NULL DEFAULT 4;

-- DropTable
DROP TABLE "UpdateBadgeSettings";
