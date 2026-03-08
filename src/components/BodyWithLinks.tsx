"use client";

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;
const ANCHOR_REGEX = /<a\s+href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]*)<\/a>/gi;

function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!)]+$/, "");
}

type Segment = { type: "text"; value: string } | { type: "anchor"; href: string; text: string } | { type: "url"; url: string };

function parseSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;

  while (pos < input.length) {
    const rest = input.slice(pos);
    const anchorRe = /<a\s+href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    const urlRe = /https?:\/\/[^\s<>"]+/g;
    const anchorMatch = anchorRe.exec(rest);
    const urlMatch = urlRe.exec(rest);

    let match: { index: number; len: number; segment: Segment } | null = null;
    if (anchorMatch && anchorMatch.index !== undefined) {
      const href = anchorMatch[1].trim();
      if (/^https?:\/\//i.test(href)) {
        match = {
          index: anchorMatch.index,
          len: anchorMatch[0].length,
          segment: { type: "anchor", href, text: anchorMatch[2] },
        };
      }
    }
    if (urlMatch && urlMatch.index !== undefined) {
      const url = trimTrailingPunctuation(urlMatch[0]);
      const candidate = { index: urlMatch.index, len: urlMatch[0].length, segment: { type: "url" as const, url } };
      if (!match || candidate.index < match.index) match = candidate;
    }

    if (match) {
      if (match.index > 0) segments.push({ type: "text", value: rest.slice(0, match.index) });
      segments.push(match.segment);
      pos += match.index + match.len;
    } else {
      segments.push({ type: "text", value: rest });
      break;
    }
  }
  return segments;
}

export function BodyWithLinks({ text, className }: { text: string; className?: string }) {
  const segments = parseSegments(text);
  return (
    <span className={className}>
      {segments.flatMap((seg, i) => {
        if (seg.type === "text") {
          const parts = seg.value.split(URL_REGEX);
          return parts.map((part, j) => {
            if (/^https?:\/\//.test(part)) {
              const href = trimTrailingPunctuation(part);
              return (
                <a
                  key={`t-${i}-${j}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-900 underline break-all"
                >
                  {part}
                </a>
              );
            }
            return <span key={`t-${i}-${j}`}>{part}</span>;
          });
        }
        if (seg.type === "anchor") {
          return (
            <a
              key={`a-${i}`}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-900 underline"
            >
              {seg.text}
            </a>
          );
        }
        return (
          <a
            key={`u-${i}`}
            href={seg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-900 underline break-all"
          >
            {seg.url}
          </a>
        );
      })}
    </span>
  );
}
