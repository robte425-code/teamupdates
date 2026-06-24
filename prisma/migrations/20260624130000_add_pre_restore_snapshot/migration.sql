-- CreateTable
CREATE TABLE "DatabasePreRestoreSnapshot" (
    "id" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabasePreRestoreSnapshot_pkey" PRIMARY KEY ("id")
);
