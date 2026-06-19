import { prisma } from "@/lib/prisma";

export async function getPopupSettings() {
  let row = await prisma.popupSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.popupSettings.create({
      data: { id: "default", activePopupId: null },
    });
  }
  return row;
}

export async function setActivePopupId(activePopupId: string | null) {
  return prisma.popupSettings.upsert({
    where: { id: "default" },
    create: { id: "default", activePopupId },
    update: { activePopupId },
  });
}

export async function getActivePopupMessage() {
  const settings = await getPopupSettings();
  if (!settings.activePopupId) return null;
  return prisma.popupMessage.findUnique({
    where: { id: settings.activePopupId },
  });
}

export async function hasUserDismissedPopup(
  userEmail: string,
  popupMessageId: string,
  popupUpdatedAt: Date
): Promise<boolean> {
  const normalizedEmail = userEmail.trim().toLowerCase();
  const dismissal = await prisma.popupDismissal.findUnique({
    where: {
      userEmail_popupMessageId: {
        userEmail: normalizedEmail,
        popupMessageId,
      },
    },
  });
  if (!dismissal) return false;
  return dismissal.popupUpdatedAt.getTime() === popupUpdatedAt.getTime();
}

export async function recordPopupDismissal(
  userEmail: string,
  popupMessageId: string,
  popupUpdatedAt: Date
) {
  const normalizedEmail = userEmail.trim().toLowerCase();
  return prisma.popupDismissal.upsert({
    where: {
      userEmail_popupMessageId: {
        userEmail: normalizedEmail,
        popupMessageId,
      },
    },
    create: {
      userEmail: normalizedEmail,
      popupMessageId,
      popupUpdatedAt,
    },
    update: {
      popupUpdatedAt,
      dismissedAt: new Date(),
    },
  });
}
