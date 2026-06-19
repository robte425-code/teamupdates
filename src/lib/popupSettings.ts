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
