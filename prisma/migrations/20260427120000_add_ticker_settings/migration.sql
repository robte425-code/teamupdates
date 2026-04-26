-- CreateTable
CREATE TABLE "TickerSettings" (
    "id" TEXT NOT NULL,
    "scrollSpeedPxPerSec" INTEGER NOT NULL DEFAULT 40,

    CONSTRAINT "TickerSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TickerSettings" ("id", "scrollSpeedPxPerSec") VALUES ('default', 40);
