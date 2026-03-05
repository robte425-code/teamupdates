import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { UpdateForm } from "@/components/UpdateForm";
import { KeyDateForm } from "@/components/KeyDateForm";
import { AdminUsersSection } from "@/components/AdminUsersSection";

export default async function ManagePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) {
    redirect("/");
  }
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-semibold text-stone-900">
          Manage content
        </h1>
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-stone-800">
              Add update or reminder
            </h2>
            <UpdateForm onSaved={() => {}} />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-stone-800">
              Add key date
            </h2>
            <KeyDateForm onSaved={() => {}} />
          </section>
          <section>
            <AdminUsersSection />
          </section>
        </div>
      </main>
    </div>
  );
}
