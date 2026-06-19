-- CreateTable
CREATE TABLE "PopupDismissal" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "popupMessageId" TEXT NOT NULL,
    "popupUpdatedAt" TIMESTAMP(3) NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopupDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PopupDismissal_userEmail_popupMessageId_key" ON "PopupDismissal"("userEmail", "popupMessageId");

-- AddForeignKey
ALTER TABLE "PopupDismissal" ADD CONSTRAINT "PopupDismissal_popupMessageId_fkey" FOREIGN KEY ("popupMessageId") REFERENCES "PopupMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
