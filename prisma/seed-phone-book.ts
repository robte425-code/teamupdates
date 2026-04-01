import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Minimal CSV row parser (handles quoted fields). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

async function main() {
  const csvPath = join(__dirname, "data", "team-phone-book.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error("No data rows in CSV");
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]!);
  if (header.length < 7) {
    console.error("Unexpected CSV header", header);
    process.exit(1);
  }

  const rows = lines.slice(1).map((line, index) => {
    const cols = parseCsvLine(line);
    while (cols.length < 7) cols.push("");
    const [employee, workCell, fax, extension, personalEmail, personalPhone, remarks] = cols;
    return {
      sortOrder: index,
      employee: employee || "",
      workCell: workCell || "",
      fax: fax || "",
      extension: extension || "",
      personalEmail: personalEmail || "",
      personalPhone: personalPhone || "",
      remarks: remarks || "",
    };
  });

  await prisma.phoneBookEntry.deleteMany({});
  await prisma.phoneBookEntry.createMany({ data: rows });

  console.log(`Seeded ${rows.length} phone book entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
