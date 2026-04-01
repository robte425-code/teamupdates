import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { PhoneBookContent } from "@/components/PhoneBookContent";

export default async function PhoneBookPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/90 via-stone-50 to-slate-100/90">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          Company phone book
        </h1>
        <PhoneBookContent />
      </main>
    </div>
  );
}
