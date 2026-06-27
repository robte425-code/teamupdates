import {
  applySuperAdminRowAccessList,
  fetchAggregatedAccess,
  saveAggregatedAccess,
} from "../src/lib/team-access-hub";
import { ensureSuperAdminsAreUpdatesAdmins } from "../src/lib/super-admin-app-access";
import { listSuperAdminEmails } from "../src/lib/super-admins";

async function main() {
  const superAdmins = await listSuperAdminEmails();
  if (superAdmins.length === 0) {
    console.log("No super admins configured; nothing to sync.");
    return;
  }

  await ensureSuperAdminsAreUpdatesAdmins();

  const { rows, appErrors: loadErrors } = await fetchAggregatedAccess();
  const merged = applySuperAdminRowAccessList(rows);
  const { appErrors: saveErrors } = await saveAggregatedAccess(merged);

  console.log(`Synced app admin access for super admin(s): ${superAdmins.join(", ")}`);
  for (const msg of [...loadErrors, ...saveErrors]) {
    console.warn(msg);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
