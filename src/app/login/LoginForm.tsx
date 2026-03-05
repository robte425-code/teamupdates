"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");
  const domainError = errorParam === "AccessDenied";

  async function handleSignIn() {
    setError("");
    setLoading(true);
    try {
      const res = await signIn("azure-ad", {
        callbackUrl,
        redirect: false,
      });
      if (res?.error) {
        setError("Sign-in was denied or failed. Try again.");
        setLoading(false);
        return;
      }
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
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
            Only @team-voc.com accounts can sign in to this site.
          </p>
        )}
        {error && !domainError && (
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
