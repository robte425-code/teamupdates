import sanitizeHtml from "sanitize-html";

export function sanitizePopupHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "div",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "a",
      "span",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      p: ["style"],
      div: ["style"],
    },
    allowedStyles: {
      span: {
        "font-size": [/^(0\.875rem|1rem|1\.125rem|1\.25rem|1\.5rem)$/],
      },
      p: {
        "font-size": [/^(0\.875rem|1rem|1\.125rem|1\.25rem|1\.5rem)$/],
      },
      div: {
        "font-size": [/^(0\.875rem|1rem|1\.125rem|1\.25rem|1\.5rem)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  }).trim();
}

export function popupHtmlToPlainPreview(html: string, maxLen = 120): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}
