-- CreateTable
CREATE TABLE "PopupMessage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByName" TEXT,
    "createdByEmail" TEXT,

    CONSTRAINT "PopupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopupSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "activePopupId" TEXT,

    CONSTRAINT "PopupSettings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton settings row
INSERT INTO "PopupSettings" ("id", "activePopupId") VALUES ('default', NULL);
