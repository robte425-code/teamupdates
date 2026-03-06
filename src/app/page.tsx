import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UpdatesSection } from "@/components/UpdatesSection";
import { KeyDatesSection } from "@/components/KeyDatesSection";
import { Header } from "@/components/Header";
import { TickerBar } from "@/components/TickerBar";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100/80">
      <Header />
      <TickerBar />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Your daily source for key dates & updates / reminders
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
