import { prisma } from "@/lib/prisma";

export const ENV_ADMINS_IMPORTED_KEY = "env_admins_imported";

export function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Authoritative admin check — DB only, evaluated live on each request. */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const row = await prisma.appAdmin.findUnique({
    where: { email: normalized },
    select: { email: true },
  });
  return Boolean(row);
}

export async function listAdminEmails(): Promise<string[]> {
  const rows = await prisma.appAdmin.findMany({
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });
  return rows.map((r) => r.email);
}

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key }, select: { value: true } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

async function countAdmins(): Promise<number> {
  return prisma.appAdmin.count();
}

async function addAdmin(email: string, addedBy: string | null): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) return;
  await prisma.appAdmin.upsert({
    where: { email: e },
    create: { email: e, addedBy },
    update: {},
  });
}

/** Replace the full admin list synced from the Access hub. */
export async function replaceAdminsList(emails: string[]): Promise<void> {
  const keep = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))
  );
  await prisma.$transaction(async (tx) => {
    await tx.appAdmin.deleteMany();
    if (keep.length > 0) {
      await tx.appAdmin.createMany({
        data: keep.map((email) => ({ email, addedBy: "team-updates" })),
      });
    }
  });
}

/** One-time import of ADMIN_EMAILS into AppAdmin (safe on every deploy). */
export async function importEnvAdminsOnce(): Promise<number> {
  const seeds = envAdminEmails();
  const done = await getSetting(ENV_ADMINS_IMPORTED_KEY);

  if (done === "1") {
    if ((await countAdmins()) === 0 && seeds.length > 0) {
      for (const email of seeds) {
        await addAdmin(email, "system (imported from ADMIN_EMAILS)");
      }
      return seeds.length;
    }
    return 0;
  }

  for (const email of seeds) {
    await addAdmin(email, "system (imported from ADMIN_EMAILS)");
  }
  await setSetting(ENV_ADMINS_IMPORTED_KEY, "1");
  return seeds.length;
}
