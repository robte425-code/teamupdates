import type { Prisma } from "@prisma/client";

/** Matches usage-stats / home visit logging exclusions for Robert. */
export const ROBERT_PAGE_VISIT_OR: Prisma.PageVisitWhereInput[] = [
  { userEmail: { equals: "robert@team-voc.com", mode: "insensitive" } },
  { userName: { equals: "Robert Evans", mode: "insensitive" } },
];

export function pageVisitWhereNotRobert(): Prisma.PageVisitWhereInput {
  return { NOT: { OR: ROBERT_PAGE_VISIT_OR } };
}
