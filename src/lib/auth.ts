import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const clientId = process.env.AZURE_AD_CLIENT_ID;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const tenantId = process.env.AZURE_AD_TENANT_ID ?? "common";

const azureConfigured = Boolean(clientId?.trim() && clientSecret?.trim());

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const allowedDomains = (process.env.ALLOWED_DOMAIN ?? "team-voc.com")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

function isAllowedDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? allowedDomains.includes(domain) : false;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: azureConfigured
    ? [
        AzureADProvider({
          clientId: clientId!.trim(),
          clientSecret: clientSecret!.trim(),
          tenantId: tenantId.trim(),
          authorization: {
            params: {
              scope: "openid profile email",
            },
          },
          profile(profile: { sub?: string; name?: string; email?: string; preferred_username?: string }, tokens) {
            return {
              id: profile.sub,
              name: profile.name ?? null,
              email: profile.email ?? profile.preferred_username ?? null,
              image: null,
            };
          },
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email ?? null;
      if (!isAllowedDomain(email)) {
        const domain = email ? email.split("@")[1] : "(no email)";
        console.warn("[auth] Access denied: email domain not allowed", {
          domain,
          email: email ? `${email.slice(0, 3)}***@${domain}` : "(missing)",
          allowedDomains,
        });
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
