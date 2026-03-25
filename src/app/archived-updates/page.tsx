import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UpdatesSection } from "@/components/UpdatesSection";
import { Header } from "@/components/Header";

export default async function ArchivedUpdatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/90 via-stone-50 to-slate-100/90">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Archived updates
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Past updates and reminders that are no longer on the main dashboard.
          </p>
        </div>
        <section className="min-w-0">
          <UpdatesSection showAddForm={false} variant="archived" />
        </section>
      </main>
    </div>
  );
}
