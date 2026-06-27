import { prisma } from "@/lib/prisma";
import { mergeAdmins } from "@/lib/admins";

export const ENV_SUPER_ADMINS_IMPORTED_KEY = "env_super_admins_imported";

export function envSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "robert@team-voc.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Authoritative super-admin check — DB only, evaluated live on each request. */
export async function isSuperAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const row = await prisma.appSuperAdmin.findUnique({
    where: { email: normalized },
    select: { email: true },
  });
  return Boolean(row);
}

export async function listSuperAdminEmails(): Promise<string[]> {
  const rows = await prisma.appSuperAdmin.findMany({
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

async function countSuperAdmins(): Promise<number> {
  return prisma.appSuperAdmin.count();
}

async function addSuperAdmin(email: string, addedBy: string | null): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) return;
  await prisma.appSuperAdmin.upsert({
    where: { email: e },
    create: { email: e, addedBy },
    update: {},
  });
}

/** Replace the full super-admin list from the Access hub. Requires at least one super admin. */
export async function replaceSuperAdminsList(emails: string[]): Promise<void> {
  const keep = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))
  );
  if (keep.length === 0) {
    throw new Error("At least one super admin is required");
  }
  await prisma.$transaction(async (tx) => {
    await tx.appSuperAdmin.deleteMany();
    await tx.appSuperAdmin.createMany({
      data: keep.map((email) => ({ email, addedBy: "team-updates" })),
    });
  });
  await mergeAdmins(keep, "super-admin-sync");
}

/** One-time import of SUPER_ADMIN_EMAILS into AppSuperAdmin (safe on every deploy). */
export async function importEnvSuperAdminsOnce(): Promise<number> {
  const seeds = envSuperAdminEmails();
  const done = await getSetting(ENV_SUPER_ADMINS_IMPORTED_KEY);

  if (done === "1") {
    if ((await countSuperAdmins()) === 0 && seeds.length > 0) {
      for (const email of seeds) {
        await addSuperAdmin(email, "system (imported from SUPER_ADMIN_EMAILS)");
      }
      return seeds.length;
    }
    return 0;
  }

  for (const email of seeds) {
    await addSuperAdmin(email, "system (imported from SUPER_ADMIN_EMAILS)");
  }
  await setSetting(ENV_SUPER_ADMINS_IMPORTED_KEY, "1");
  return seeds.length;
}
