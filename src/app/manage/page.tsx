import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";

const ManageContent = dynamic(
  () => import("@/components/ManageContent").then((m) => ({ default: m.ManageContent })),
  { ssr: false, loading: () => <p className="text-stone-500">Loading…</p> }
);

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
        <ManageContent />
      </main>
    </div>
  );
}
