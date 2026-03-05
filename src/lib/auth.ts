import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const allowedDomain = (process.env.ALLOWED_DOMAIN ?? "team-voc.com").trim().toLowerCase();

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

function isAllowedDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === allowedDomain;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!isAllowedDomain(user.email)) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id ?? token.sub;
        token.email = user.email ?? token.email;
        token.role = isAdmin(user.email) ? "admin" : "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token.id ?? token.sub) as string;
        (session.user as { role?: string }).role = (token.role as string) ?? "member";
      }
      return session;
    },
  },
};
