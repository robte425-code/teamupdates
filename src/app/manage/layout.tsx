import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readImpersonateEmail } from "@/lib/impersonation";
import { Header } from "@/components/Header";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (readImpersonateEmail()) redirect("/");
  const isAdmin = (session.user as { role?: string }).role === "admin";
  if (!isAdmin) redirect("/");

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}

