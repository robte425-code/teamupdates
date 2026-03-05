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
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-semibold text-stone-900">
          Teamvoc Updates
        </h1>
        <section className="mb-12">
          <UpdatesSection />
        </section>
        <section className="mb-12">
          <KeyDatesSection />
        </section>
        {isAdmin && (
          <section>
            <AdminUsersSection />
          </section>
        )}
      </main>
    </div>
  );
}
