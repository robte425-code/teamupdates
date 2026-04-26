import type { ReactNode } from "react";

/** Shown in admin forms (title + body support the same syntax). */
export const RICH_TEXT_FORMAT_HINT =
  "Title and body: **bold**, [link label](https://…), or paste a plain https:// URL.";

const BARE_URL_RE = /^(https?:\/\/[^\s<>"]+)/i;

export function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!)]+$/, "");
}

export function sanitizeMarkdownHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

type ParseCtx = {
  key: number;
  allowBold: boolean;
  allowMdLink: boolean;
};

const linkClass = "text-stone-900 underline break-all";

function nextKey(ctx: ParseCtx): string {
  return `rt-${ctx.key++}`;
}

/** Plain visible text for previews (no markup tokens). */
export function stripRichTextMarkup(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        out += stripRichTextMarkup(text.slice(i + 2, close));
        i = close + 2;
        continue;
      }
    }
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (
        closeBracket !== -1 &&
        text[closeBracket + 1] === "(" &&
        text.indexOf(")", closeBracket + 2) !== -1
      ) {
        const closeParen = text.indexOf(")", closeBracket + 2);
        const urlRaw = text.slice(closeBracket + 2, closeParen).trim();
        if (sanitizeMarkdownHref(urlRaw)) {
          out += stripRichTextMarkup(text.slice(i + 1, closeBracket));
          i = closeParen + 1;
          continue;
        }
      }
    }
    const rest = text.slice(i);
    const urlMatch = rest.match(BARE_URL_RE);
    if (urlMatch) {
      out += urlMatch[1];
      i += urlMatch[1].length;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function parseRichTextImpl(text: string, ctx: ParseCtx): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < text.length) {
    if (ctx.allowBold && text[i] === "*" && text[i + 1] === "*") {
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        const inner = text.slice(i + 2, close);
        nodes.push(
          <strong key={nextKey(ctx)} className="font-semibold text-stone-900">
            {parseRichTextImpl(inner, {
              ...ctx,
              allowBold: false,
            })}
          </strong>
        );
        i = close + 2;
        continue;
      }
    }

    if (ctx.allowMdLink && text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (
        closeBracket !== -1 &&
        text[closeBracket + 1] === "(" &&
        text.indexOf(")", closeBracket + 2) !== -1
      ) {
        const closeParen = text.indexOf(")", closeBracket + 2);
        const label = text.slice(i + 1, closeBracket);
        const urlRaw = text.slice(closeBracket + 2, closeParen).trim();
        const href = sanitizeMarkdownHref(urlRaw);
        if (href) {
          nodes.push(
            <a
              key={nextKey(ctx)}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {parseRichTextImpl(label, {
                ...ctx,
                allowMdLink: false,
              })}
            </a>
          );
          i = closeParen + 1;
          continue;
        }
      }
    }

    const rest = text.slice(i);
    const urlMatch = rest.match(BARE_URL_RE);
    if (urlMatch) {
      const full = urlMatch[1];
      const href = trimTrailingPunctuation(full);
      nodes.push(
        <a
          key={nextKey(ctx)}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {full}
        </a>
      );
      i += full.length;
      continue;
    }

    nodes.push(text[i]);
    i += 1;
  }

  return mergeAdjacentStrings(nodes);
}

function mergeAdjacentStrings(nodes: ReactNode[]): ReactNode[] {
  const out: ReactNode[] = [];
  let buf = "";
  for (const n of nodes) {
    if (typeof n === "string") {
      buf += n;
    } else {
      if (buf) {
        out.push(buf);
        buf = "";
      }
      out.push(n);
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function parseRichTextToNodes(text: string): ReactNode[] {
  if (!text) return [];
  return parseRichTextImpl(text, {
    key: 0,
    allowBold: true,
    allowMdLink: true,
  });
}
