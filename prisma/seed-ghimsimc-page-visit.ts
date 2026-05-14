import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "ghimsimc@gmail.com";
const NAME = "Ghim-Sim Chua";
const PATH = "/";

/** Pacific “inactive days” vs cron threshold; default 10 works with default threshold 7. Set VISIT_DAYS_AGO=0 for a “just visited” row. */
function parseDaysAgo(): number {
  const raw = process.env.VISIT_DAYS_AGO;
  if (raw === undefined || raw === "") return 10;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 10;
  return n;
}

const daysAgo = parseDaysAgo();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: EMAIL, mode: "insensitive" } },
    select: { id: true },
  });

  const removed = await prisma.pageVisit.deleteMany({
    where: {
      path: PATH,
      userEmail: { equals: EMAIL, mode: "insensitive" },
    },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} existing ${PATH} visit(s) for ${EMAIL}.`);
  }

  const visitedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const row = await prisma.pageVisit.create({
    data: {
      userId: user?.id,
      userName: NAME,
      userEmail: EMAIL,
      path: PATH,
      visitedAt,
    },
  });
  console.log(
    `Created PageVisit ${row.id} for ${EMAIL} (${NAME}) on ${PATH} at ${visitedAt.toISOString()} (${daysAgo} day(s) ago; set VISIT_DAYS_AGO to change).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
