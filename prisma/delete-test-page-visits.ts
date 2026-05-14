import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Removes PageVisit rows used for reminder testing (all paths). */
async function main() {
  const result = await prisma.pageVisit.deleteMany({
    where: {
      OR: [
        { userEmail: { equals: "ghimsimc@gmail.com", mode: "insensitive" } },
        { userEmail: { equals: "robert@team-voc.com", mode: "insensitive" } },
      ],
    },
  });
  console.log(`Deleted ${result.count} PageVisit row(s) for ghimsimc@gmail.com and robert@team-voc.com.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
