import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Auth is now Microsoft 365 (Azure AD). Site owners are set via ADMIN_EMAILS env.
  // No local user seeding needed.
  console.log("Seed complete. Use Azure AD to sign in; set ADMIN_EMAILS for site owners.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
