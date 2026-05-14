-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "inactiveDaysThreshold" INTEGER NOT NULL DEFAULT 7,
    "emailSubject" TEXT NOT NULL DEFAULT 'Reminder: TEAM dashboard',
    "emailBody" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ReminderSettings" ("id", "inactiveDaysThreshold", "emailSubject", "emailBody")
VALUES (
    'default',
    7,
    'Reminder: TEAM dashboard',
    $BODY$Hi {{firstName}},

We have not seen you on the TEAM dashboard for {{inactiveDays}} days.

Please visit: {{dashboardUrl}}

Thank you.$BODY$
);

-- CreateTable
CREATE TABLE "ReminderRecipient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderRecipient_email_key" ON "ReminderRecipient"("email");
