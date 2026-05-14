import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROBERT_EMAIL = "robert@team-voc.com";
const ROBERT_NAME = "Robert Evans";
const PATH = "/";
const DAYS_AGO = 10;

async function main() {
  const visitedAt = new Date(Date.now() - DAYS_AGO * 24 * 60 * 60 * 1000);
  const row = await prisma.pageVisit.create({
    data: {
      userName: ROBERT_NAME,
      userEmail: ROBERT_EMAIL,
      path: PATH,
      visitedAt,
    },
  });
  console.log(
    `Created PageVisit ${row.id} for ${ROBERT_EMAIL} on ${PATH} at ${visitedAt.toISOString()} (${DAYS_AGO} days ago).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
