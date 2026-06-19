"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizePopupHtml } from "@/lib/sanitizePopupHtml";

const FONT_SIZES = [
  { label: "Small", value: "0.875rem" },
  { label: "Normal", value: "1rem" },
  { label: "Large", value: "1.125rem" },
  { label: "Extra large", value: "1.25rem" },
] as const;

function toolbarBtn(active?: boolean) {
  return `rounded px-2 py-1 text-xs font-medium ${
    active ? "bg-stone-800 text-white" : "bg-white text-stone-700 hover:bg-stone-100"
  } border border-stone-300`;
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
  const [fontSize, setFontSize] = useState<string>("1rem");

  const syncFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(sanitizePopupHtml(el.innerHTML));
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

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
    const label = window.getSelection()?.toString() || href;
    exec("insertHTML", `<a href="${href}">${label}</a>`);
  }

  function applyFontSize(size: string) {
    setFontSize(size);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      exec("insertHTML", `<span style="font-size: ${size}"> </span>`);
      return;
    }
    exec("insertHTML", `<span style="font-size: ${size}">${sel.toString()}</span>`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 p-2">
        <button type="button" className={toolbarBtn()} onClick={() => exec("bold")} title="Bold">
          Bold
        </button>
        <button type="button" className={toolbarBtn()} onClick={() => exec("italic")} title="Italic">
          Italic
        </button>
        <button type="button" className={toolbarBtn()} onClick={wrapLink} title="Insert link">
          Link
        </button>
        <button
          type="button"
          className={toolbarBtn()}
          onClick={() => exec("insertUnorderedList")}
          title="Bullet list"
        >
          List
        </button>
        <label className="ml-1 flex items-center gap-1 text-xs text-stone-600">
          Size
          <select
            value={fontSize}
            onChange={(e) => applyFontSize(e.target.value)}
            className="rounded border border-stone-300 bg-white px-1.5 py-1 text-xs text-stone-800"
          >
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
        data-placeholder={placeholder}
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        className="popup-rich-editor min-h-[10rem] max-h-[20rem] overflow-y-auto rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <p className="text-xs text-stone-500">
        Use the toolbar for bold, links, lists, and font size. Long messages scroll in the popup.
      </p>
    </div>
  );
}
