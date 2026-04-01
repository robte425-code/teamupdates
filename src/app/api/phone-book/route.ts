import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PhoneBookEntryDTO = {
  id: string;
  sortOrder: number;
  employee: string;
  isEmployee: boolean;
  workCell: string;
  fax: string;
  extension: string;
  personalEmail: string;
  personalPhone: string;
  remarks: string;
};

function serialize(
  row: {
    id: string;
    sortOrder: number;
    employee: string;
    isEmployee: boolean;
    workCell: string;
    fax: string;
    extension: string;
    personalEmail: string;
    personalPhone: string;
    remarks: string;
  }
): PhoneBookEntryDTO {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    employee: row.employee,
    isEmployee: row.isEmployee,
    workCell: row.workCell,
    fax: row.fax,
    extension: row.extension,
    personalEmail: row.personalEmail,
    personalPhone: row.personalPhone,
    remarks: row.remarks,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.phoneBookEntry.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(rows.map(serialize));
}

type IncomingEntry = {
  id?: string;
  employee?: string;
  isEmployee?: boolean;
  workCell?: string;
  fax?: string;
  extension?: string;
  personalEmail?: string;
  personalPhone?: string;
  remarks?: string;
};

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { entries?: IncomingEntry[] };
  const entries = body.entries;
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries array required" }, { status: 400 });
  }

  const keepIds = entries.map((e) => e.id).filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    if (keepIds.length === 0) {
      await tx.phoneBookEntry.deleteMany({});
    } else {
      await tx.phoneBookEntry.deleteMany({
        where: { id: { notIn: keepIds } },
      });
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      const data = {
        employee: (e.employee ?? "").trim(),
        isEmployee: typeof e.isEmployee === "boolean" ? e.isEmployee : true,
        workCell: (e.workCell ?? "").trim(),
        fax: (e.fax ?? "").trim(),
        extension: (e.extension ?? "").trim(),
        personalEmail: (e.personalEmail ?? "").trim(),
        personalPhone: (e.personalPhone ?? "").trim(),
        remarks: (e.remarks ?? "").trim(),
        sortOrder: i,
      };
      if (e.id) {
        await tx.phoneBookEntry.update({
          where: { id: e.id },
          data,
        });
      } else {
        await tx.phoneBookEntry.create({ data });
      }
    }
  });

  const rows = await prisma.phoneBookEntry.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(rows.map(serialize));
}
