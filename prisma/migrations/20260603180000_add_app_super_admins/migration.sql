-- CreateTable
CREATE TABLE "AppSuperAdmin" (
    "email" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSuperAdmin_pkey" PRIMARY KEY ("email")
);

-- Seed initial super admin
INSERT INTO "AppSuperAdmin" ("email", "addedBy", "createdAt")
VALUES ('robert@team-voc.com', 'migration', CURRENT_TIMESTAMP);

-- Super admins are Updates app admins too
INSERT INTO "AppAdmin" ("email", "addedBy", "createdAt")
VALUES ('robert@team-voc.com', 'super-admin-sync', CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;
