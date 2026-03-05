"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-stone-900">Something went wrong</h1>
      <p className="max-w-md text-center text-sm text-stone-600">
        A client-side error occurred. Try refreshing the page, or sign in again.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        Try again
      </button>
      <a
        href="/login"
        className="text-sm text-stone-500 underline hover:text-stone-700"
      >
        Go to sign in
      </a>
    </div>
  );
}
