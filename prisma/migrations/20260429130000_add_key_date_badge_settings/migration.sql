-- CreateTable
CREATE TABLE "KeyDateBadgeSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "newBadgeDays" INTEGER NOT NULL DEFAULT 3,
    "soonBadgeDays" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "KeyDateBadgeSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "KeyDateBadgeSettings" ("id", "newBadgeDays", "soonBadgeDays") VALUES ('default', 3, 7);
