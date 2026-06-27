import { importEnvSuperAdminsOnce } from "../src/lib/super-admins";
import { ensureSuperAdminsAreUpdatesAdmins } from "../src/lib/super-admin-app-access";

async function main() {
  const imported = await importEnvSuperAdminsOnce();
  const synced = await ensureSuperAdminsAreUpdatesAdmins();
  console.log(`Imported ${imported} super admin(s) from SUPER_ADMIN_EMAILS`);
  console.log(`Ensured ${synced} super admin(s) are Updates app admins`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
