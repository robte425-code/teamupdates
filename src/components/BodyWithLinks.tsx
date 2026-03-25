"use client";

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;

function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!)]+$/, "");
}

export function BodyWithLinks({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_REGEX);
  const mergedClassName = [className, "whitespace-pre-line"].filter(Boolean).join(" ");
  return (
    <span className={mergedClassName}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          const href = trimTrailingPunctuation(part);
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-900 underline break-all"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}
