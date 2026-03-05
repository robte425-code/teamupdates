import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UpdatesSection } from "@/components/UpdatesSection";
import { KeyDatesSection } from "@/components/KeyDatesSection";
import { Header } from "@/components/Header";
import { AdminUsersSection } from "@/components/AdminUsersSection";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  const isAdmin = (session.user as { role?: string }).role === "admin";
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="min-w-0">
            <UpdatesSection />
          </section>
          <section className="min-w-0">
            <KeyDatesSection />
          </section>
        </div>
        {isAdmin && (
          <section className="mt-10 border-t border-stone-200 pt-8">
            <AdminUsersSection />
          </section>
        )}
      </main>
    </div>
  );
}
