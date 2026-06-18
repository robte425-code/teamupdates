"use client";

import { useState } from "react";
import { stopImpersonation } from "../impersonate-client";

export function ImpersonationBanner({
  name,
  email,
  apiPath = "/api/impersonate",
}: {
  name: string;
  email: string;
  apiPath?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-sm text-amber-950">
      <span>
        Viewing as <strong>{name}</strong>{" "}
        <span className="text-amber-900/80">({email})</span> — you&apos;re seeing exactly what they
        see in this app.
      </span>
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          await stopImpersonation(apiPath);
        }}
        disabled={busy}
        className="rounded-md bg-amber-950/15 px-3 py-1 font-medium text-amber-950 transition-colors hover:bg-amber-950/25 disabled:opacity-60"
      >
        {busy ? "Exiting…" : "Exit view-as"}
      </button>
    </div>
  );
}
