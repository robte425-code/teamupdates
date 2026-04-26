"use client";

import { parseRichTextToNodes } from "@/lib/richText";

export function BodyWithLinks({
  text,
  className,
  preLine = true,
}: {
  text: string;
  className?: string;
  /** Preserve newlines in body text; use false for single-line titles. */
  preLine?: boolean;
}) {
  const mergedClassName = [className, preLine && "whitespace-pre-line"].filter(Boolean).join(" ");
  return <span className={mergedClassName || undefined}>{parseRichTextToNodes(text)}</span>;
}
