import { useEffect, useRef, useState } from "react";

export default function ChatComposer({ onSend, loading }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const textareaRef = useRef(null);

  const canSend = (text.trim() || file) && !loading;

  useEffect(() => {
    if (!attachMenuOpen) return;
    const onClick = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) setAttachMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setAttachMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [attachMenuOpen]);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const autoGrow = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend({ text: text.trim(), file });
    setText("");
    clearFile();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pb-6 pt-2">
      <div className="glass rounded-3xl p-2">
        {preview && (
          <div className="flex items-center gap-2 px-2 pt-2">
            <div className="relative">
              <img src={preview} alt="Attached" className="h-16 w-16 object-cover rounded-xl border border-ink/10" />
              <button
                onClick={clearFile}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent text-paper text-xs flex items-center justify-center shadow"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          </div>
        )}
        {file && !preview && (
          <div className="flex items-center gap-2 px-3 pt-2">
            <div className="flex items-center gap-2 bg-ink/5 rounded-xl px-3 py-2 max-w-full">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-slate shrink-0">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9 3h4l6 6v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 0v6h6"
                />
              </svg>
              <span className="text-xs text-ink truncate max-w-[220px]">{file.name}</span>
              <button onClick={clearFile} className="text-slate hover:text-flag text-sm shrink-0" aria-label="Remove attachment">
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 px-2 py-1.5">
          <div className="relative shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              onClick={() => setAttachMenuOpen((o) => !o)}
              title="Attach a photo or file"
              className={`press w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150 ${
                attachMenuOpen ? "text-ink bg-ink/10" : "text-slate hover:text-ink hover:bg-ink/5"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 5v14M5 12h14" />
              </svg>
            </button>

            {attachMenuOpen && (
              <div
                style={{ "--pop-origin": "bottom left" }}
                className="pop-in absolute left-0 bottom-full mb-2 w-52 rounded-2xl border border-ink/10 bg-paper shadow-lg overflow-hidden z-20"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    photoInputRef.current?.click();
                  }}
                  className="press w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-ink transition-colors duration-150 hover:bg-ink/5"
                >
                  <span className="w-7 h-7 rounded-full bg-mauve/30 text-accent flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                      <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={1.75} />
                      <circle cx="9" cy="11" r="2" strokeWidth={1.75} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m21 16-5-4-9 7" />
                    </svg>
                  </span>
                  <span>
                    Photo
                    <span className="block text-xs text-slate">Snap or pick an image of the problem</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="press w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-ink transition-colors duration-150 hover:bg-ink/5"
                >
                  <span className="w-7 h-7 rounded-full bg-mauve/30 text-accent flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M9 2h4l6 6v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm4 0v6h6"
                      />
                    </svg>
                  </span>
                  <span>
                    File
                    <span className="block text-xs text-slate">Upload a .txt of your problem</span>
                  </span>
                </button>
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoGrow(e.target);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask a doubt, paste a problem, or attach a photo..."
            className="flex-1 resize-none bg-transparent text-ink text-sm placeholder:text-slate/70 focus:outline-none py-2 max-h-[200px]"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            title="Send"
            className="press shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-accent text-paper disabled:opacity-30 transition-[opacity,transform] duration-150 hover:opacity-90 shadow-sm"
          >
            {loading ? (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-ink/40 mt-2">
        Photos of DSA, C++, OS or DBMS problems work best · <kbd className="font-mono">Enter</kbd> to send,{" "}
        <kbd className="font-mono">Shift + Enter</kbd> for a new line
      </p>
    </div>
  );
}
