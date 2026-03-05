"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");
  const domainError = errorParam === "AccessDenied";
  const oauthSigninError = errorParam === "OAuthSignin";
  const oauthCallbackError = errorParam === "OAuthCallback";

  function handleSignIn() {
    setError("");
    setLoading(true);
    // Let NextAuth redirect to Microsoft (OAuth doesn't work with redirect: false)
    signIn("azure-ad", { callbackUrl });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-stone-900">
          Sign in
        </h1>
        <p className="mb-6 text-sm text-stone-500">
          Use your Microsoft 365 account (@team-voc.com) to access updates and key dates.
        </p>
        {domainError && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Your account&apos;s domain is not allowed. Only the configured domains can sign in (e.g. @team-voc.com). If you use an @…onmicrosoft.com address, add that domain to ALLOWED_DOMAIN in your deployment settings.
          </p>
        )}
        {oauthSigninError && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Sign-in could not be started. Check that Azure AD is configured: in your deployment (e.g. Vercel → Project → Settings → Environment Variables) set <strong>AZURE_AD_CLIENT_ID</strong>, <strong>AZURE_AD_CLIENT_SECRET</strong>, and <strong>AZURE_AD_TENANT_ID</strong>. In the Azure app registration, add the redirect URI: <strong>https://your-site.vercel.app/api/auth/callback/azure-ad</strong> (use your actual site URL).
          </p>
        )}
        {oauthCallbackError && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Sign-in failed after Microsoft redirected back. Check: (1) In Azure → Authentication, the redirect URI is exactly <strong>https://teamvoc-updates.vercel.app/api/auth/callback/azure-ad</strong> (no trailing slash). (2) In Vercel, <strong>NEXTAUTH_URL</strong> is exactly <strong>https://teamvoc-updates.vercel.app</strong>. (3) The client secret in Vercel is correct and not expired. Try creating a new secret in Azure and updating <strong>AZURE_AD_CLIENT_SECRET</strong>.
          </p>
        )}
        {error && !domainError && !oauthSigninError && !oauthCallbackError && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2F2F2F] px-4 py-3 font-medium text-white hover:bg-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#6264A7] focus:ring-offset-2 disabled:opacity-60"
        >
          <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 10.5H0V0H10.5V10.5Z" fill="#F25022"/>
            <path d="M21 10.5H10.5V0H21V10.5Z" fill="#7FBA00"/>
            <path d="M10.5 21H0V10.5H10.5V21Z" fill="#00A4EF"/>
            <path d="M21 21H10.5V10.5H21V21Z" fill="#FFB900"/>
          </svg>
          {loading ? "Signing in…" : "Sign in with Microsoft"}
        </button>
      </div>
    </div>
  );
}
