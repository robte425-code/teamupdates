-- CreateTable
CREATE TABLE "UpdateBadgeSettings" (
    "id" TEXT NOT NULL,
    "updatedBadgeDays" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "UpdateBadgeSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UpdateBadgeSettings" ("id", "updatedBadgeDays") VALUES ('default', 4);
