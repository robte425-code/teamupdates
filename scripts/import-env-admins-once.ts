import { importEnvAdminsOnce } from "../src/lib/admins";

async function main() {
  const imported = await importEnvAdminsOnce();
  if (imported > 0) {
    console.log(`Imported ${imported} admin(s) from ADMIN_EMAILS (one-time migration).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
