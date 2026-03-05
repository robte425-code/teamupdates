import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UpdatesSection } from "@/components/UpdatesSection";
import { KeyDatesSection } from "@/components/KeyDatesSection";
import { Header } from "@/components/Header";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
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
