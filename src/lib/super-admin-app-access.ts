import { mergeAdmins } from "@/lib/admins";
import { listSuperAdminEmails } from "@/lib/super-admins";

/** Ensure every super admin is an Updates app admin (local DB). */
export async function ensureSuperAdminsAreUpdatesAdmins(): Promise<number> {
  const emails = await listSuperAdminEmails();
  if (emails.length === 0) return 0;
  await mergeAdmins(emails, "super-admin-sync");
  return emails.length;
}
