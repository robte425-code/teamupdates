"use client";

import { sanitizePopupHtml } from "@/lib/sanitizePopupHtml";

export function PopupMessageBody({ html }: { html: string }) {
  const safe = sanitizePopupHtml(html);
  return (
    <div
      className="popup-message-body prose prose-sm max-w-none text-stone-700"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
