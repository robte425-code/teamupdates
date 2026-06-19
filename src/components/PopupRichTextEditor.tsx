"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizePopupHtml } from "@/lib/sanitizePopupHtml";

const FONT_SIZES = [
  { label: "Small", value: "0.875rem" },
  { label: "Normal", value: "1rem" },
  { label: "Large", value: "1.125rem" },
  { label: "Extra large", value: "1.25rem" },
] as const;

const EMPTY_HTML = "<p><br></p>";

function toolbarBtn(active?: boolean) {
  return `rounded px-2 py-1 text-xs font-medium ${
    active ? "bg-stone-800 text-white" : "bg-white text-stone-700 hover:bg-stone-100"
  } border border-stone-300`;
}

function isEditorEmpty(html: string): boolean {
  const stripped = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<div>\s*<\/div>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return !stripped;
}

function normalizeEditorHtml(html: string): string {
  return isEditorEmpty(html) ? EMPTY_HTML : html;
}

function readEditorHtml(el: HTMLDivElement): string {
  const html = el.innerHTML;
  return isEditorEmpty(html) ? "" : html;
}

function stripFontSizeFromFragment(fragment: DocumentFragment) {
  const unwrapElement = (el: Element) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  };

  fragment.querySelectorAll("span[style]").forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.fontSize = "";
    if (!htmlEl.getAttribute("style")?.trim()) {
      unwrapElement(el);
    }
  });
}

function preventToolbarBlur(e: React.MouseEvent) {
  e.preventDefault();
}

export function PopupRichTextEditor({
  value,
  onChange,
  placeholder = "Message body…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const skipExternalSync = useRef(false);
  const lastValueRef = useRef(value);
  const [fontSize, setFontSize] = useState("");
  const [isEmpty, setIsEmpty] = useState(!value || isEditorEmpty(value));

  const updateEmptyState = useCallback((html: string) => {
    setIsEmpty(isEditorEmpty(html));
  }, []);

  const emitChange = useCallback(
    (html: string) => {
      skipExternalSync.current = true;
      lastValueRef.current = html;
      updateEmptyState(html || EMPTY_HTML);
      onChange(html);
    },
    [onChange, updateEmptyState]
  );

  const syncFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    emitChange(readEditorHtml(el));
  }, [emitChange]);

  const syncSanitizedFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const raw = readEditorHtml(el);
    const clean = sanitizePopupHtml(raw);
    if (clean !== raw) {
      el.innerHTML = normalizeEditorHtml(clean);
    }
    updateEmptyState(clean || EMPTY_HTML);
    emitChange(clean);
  }, [emitChange, updateEmptyState]);

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    if (range.collapsed) return;
    savedSelectionRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedSelectionRef.current;
    const sel = window.getSelection();
    if (!range || !sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = normalizeEditorHtml(value || EMPTY_HTML);
    updateEmptyState(value || EMPTY_HTML);
    lastValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  useEffect(() => {
    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }
    if (document.activeElement === editorRef.current) return;
    if (value === lastValueRef.current) return;

    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = normalizeEditorHtml(value || EMPTY_HTML);
    lastValueRef.current = value;
    updateEmptyState(value || EMPTY_HTML);
  }, [value, updateEmptyState]);

  function exec(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    syncFromEditor();
  }

  function wrapLink() {
    const url = window.prompt("Link URL (https://…)");
    if (!url?.trim()) return;
    const href = url.trim();
    if (!/^https?:\/\//i.test(href)) {
      window.alert("Links must start with http:// or https://");
      return;
    }

    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim()) {
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand("insertHTML", false, `<a href="${href}">${href}</a>`);
    }
    syncFromEditor();
  }

  function applyFontSize(size: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (range.collapsed) {
      if (size === "1rem") {
        setFontSize("");
        return;
      }
      document.execCommand(
        "insertHTML",
        false,
        `<span style="font-size: ${size}">\u200B</span>`
      );
      syncFromEditor();
      setFontSize("");
      return;
    }

    if (size === "1rem") {
      const fragment = range.extractContents();
      stripFontSizeFromFragment(fragment);
      range.insertNode(fragment);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      const span = document.createElement("span");
      span.style.fontSize = size;
      try {
        range.surroundContents(span);
      } catch {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
        sel.removeAllRanges();
        const next = document.createRange();
        next.selectNodeContents(span);
        next.collapse(false);
        sel.addRange(next);
      }
    }

    syncFromEditor();
    setFontSize("");
  }

  function handleEditorBlur(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && toolbarRef.current?.contains(next)) return;
    syncSanitizedFromEditor();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncFromEditor();
  }

  return (
    <div className="space-y-2">
      <div
        ref={toolbarRef}
        className="flex flex-wrap items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 p-2"
      >
        <button
          type="button"
          className={toolbarBtn()}
          onMouseDown={preventToolbarBlur}
          onClick={() => exec("bold")}
          title="Bold"
        >
          Bold
        </button>
        <button
          type="button"
          className={toolbarBtn()}
          onMouseDown={preventToolbarBlur}
          onClick={() => exec("italic")}
          title="Italic"
        >
          Italic
        </button>
        <button
          type="button"
          className={toolbarBtn()}
          onMouseDown={preventToolbarBlur}
          onClick={() => exec("underline")}
          title="Underline"
        >
          Underline
        </button>
        <button
          type="button"
          className={toolbarBtn()}
          onMouseDown={preventToolbarBlur}
          onClick={wrapLink}
          title="Insert link"
        >
          Link
        </button>
        <button
          type="button"
          className={toolbarBtn()}
          onMouseDown={preventToolbarBlur}
          onClick={() => exec("insertUnorderedList")}
          title="Bullet list"
        >
          List
        </button>
        <label className="ml-1 flex items-center gap-1 text-xs text-stone-600">
          Size
          <select
            value={fontSize}
            onChange={(e) => {
              const size = e.target.value;
              if (!size) return;
              applyFontSize(size);
            }}
            className="rounded border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-800"
          >
            <option value="">Size</option>
            {FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        spellCheck
        data-placeholder={placeholder}
        data-empty={isEmpty ? "true" : "false"}
        onInput={syncFromEditor}
        onBlur={handleEditorBlur}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onSelect={saveSelection}
        onPaste={handlePaste}
        className="popup-rich-editor min-h-[10rem] max-h-[20rem] overflow-y-auto rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <p className="text-xs text-stone-500">
        Type normally; use the toolbar for bold, links, lists, and font size. Long messages scroll in the popup.
      </p>
    </div>
  );
}
