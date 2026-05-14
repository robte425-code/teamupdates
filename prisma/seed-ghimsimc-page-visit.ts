import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "ghimsimc@gmail.com";
const NAME = "Ghim-Sim Chua";
const PATH = "/";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: EMAIL, mode: "insensitive" } },
    select: { id: true },
  });

  const visitedAt = new Date();
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
    `Created PageVisit ${row.id} for ${EMAIL} (${NAME}) on ${PATH} at ${visitedAt.toISOString()}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
