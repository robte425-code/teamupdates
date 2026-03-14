import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdatesSection } from "@/components/UpdatesSection";
import { KeyDatesSection } from "@/components/KeyDatesSection";
import { Header } from "@/components/Header";
import { HomeAutoReload } from "@/components/HomeAutoReload";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Log this visit and prune visits older than ~2 months
  const user = session.user as { id?: string; name?: string | null; email?: string | null };
  const userId = user.id;
  const userName = user.name ?? null;
  const userEmail = user.email ?? null;

  const now = new Date();
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.pageVisit.create({
      data: {
        userId: userId ?? undefined,
        userName: userName ?? undefined,
        userEmail: userEmail ?? undefined,
        path: "/",
      },
    }),
    prisma.pageVisit.deleteMany({
      where: {
        visitedAt: { lt: twoMonthsAgo },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/90 via-stone-50 to-slate-100/90">
      <HomeAutoReload />
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Your TEAM Dashboard
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Your source for key dates & updates / reminders
          </p>
        </div>
        <div className="grid gap-10 lg:grid-cols-2">
          <section className="min-w-0">
            <UpdatesSection showAddForm={false} />
          </section>
          <section className="min-w-0">
            <KeyDatesSection showAddForm={false} />
          </section>
        </div>
      </main>
    </div>
  );
}
