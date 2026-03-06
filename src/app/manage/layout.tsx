import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Header } from "@/components/Header";
import { TickerBar } from "@/components/TickerBar";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) redirect("/");

  return (
    <div className="min-h-screen">
      <Header />
      <TickerBar />
      <div className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </div>
    </div>
  );
}
