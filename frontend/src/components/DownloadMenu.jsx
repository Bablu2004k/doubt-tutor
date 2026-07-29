import { useEffect, useRef, useState } from "react";
import { downloadMarkdown, downloadPDF, downloadWord } from "../utils/exportDoc.js";

// A small "Download" button that opens a format picker (Markdown / PDF /
// Word) so students can save an answer or roadmap and study it offline.
export default function DownloadMenu({ title, content, label = "Download" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn(title, content);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        title="Download this"
        className="press flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-ink/15 text-ink/70 transition-colors duration-150 hover:text-ink hover:bg-ink/5 disabled:opacity-40"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
          />
        </svg>
        {label}
      </button>

      {open && (
        <div
          style={{ "--pop-origin": "top right" }}
          className="pop-in absolute right-0 top-full mt-2 z-20 w-44 rounded-2xl border border-ink/10 bg-paper shadow-lg overflow-hidden"
        >
          {[
            { key: "md", text: "Markdown (.md)", fn: downloadMarkdown },
            { key: "pdf", text: "PDF (.pdf)", fn: downloadPDF },
            { key: "docx", text: "Word (.docx)", fn: downloadWord },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => run(opt.fn)}
              className="press w-full text-left px-3.5 py-2.5 text-sm text-ink transition-colors duration-150 hover:bg-ink/5"
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
