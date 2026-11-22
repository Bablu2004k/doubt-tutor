import { useEffect, useRef, useState } from "react";
import CameraCapture from "./CameraCapture";
import { transcribeApi } from "../api/api.js";
import { blobToWav16k } from "../utils/audio.js";

const SpeechRecognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function ChatComposer({ onSend, loading }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");
  const mediaRef = useRef(null);
  const fellBackRef = useRef(false);
  const [transcribing, setTranscribing] = useState(false);

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

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      const rec = mediaRef.current?.recorder;
      if (rec && rec.state === "recording") rec.stop();
    },
    []
  );

  // Fallback for browsers without the Web Speech API (Firefox, Brave, some
  // mobile browsers): record audio, convert to WAV, transcribe on the server.
  const startRecorder = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Voice input isn't supported in this browser.");
      fellBackRef.current = false;
      setListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        clearTimeout(mediaRef.current?.timer);
        stream.getTracks().forEach((t) => t.stop());
        fellBackRef.current = false;
        setListening(false);
        if (!chunks.length) return;
        setTranscribing(true);
        try {
          const wav = await blobToWav16k(new Blob(chunks, { type: recorder.mimeType }));
          const { data } = await transcribeApi.send(wav);
          if (data.text) {
            setText((prev) => (prev ? prev.replace(/\s*$/, " ") : "") + data.text);
            requestAnimationFrame(() => textareaRef.current && autoGrow(textareaRef.current));
          } else {
            setVoiceError("Didn't catch any speech. Try again.");
          }
        } catch {
          setVoiceError("Couldn't transcribe that. Please try again.");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRef.current = {
        recorder,
        // Safety stop so a forgotten recording never runs forever.
        timer: setTimeout(() => recorder.state === "recording" && recorder.stop(), 60000),
      };
      recorder.start();
      setListening(true);
    } catch (e) {
      fellBackRef.current = false;
      setListening(false);
      setVoiceError(
        e?.name === "NotAllowedError"
          ? "Microphone permission was blocked. Allow it in your browser's site settings."
          : "Couldn't access the microphone."
      );
    }
  };

  const toggleVoice = () => {
    if (listening) {
      if (mediaRef.current?.recorder?.state === "recording") mediaRef.current.recorder.stop();
      else recognitionRef.current?.stop();
      return;
    }
    if (transcribing) return;
    setVoiceError("");
    if (!SpeechRecognition) {
      startRecorder();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = navigator.language || "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    baseTextRef.current = text ? text.replace(/\s*$/, " ") : "";

    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setText(baseTextRef.current + transcript);
      requestAnimationFrame(() => textareaRef.current && autoGrow(textareaRef.current));
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        setVoiceError("Microphone permission was blocked. Allow it in your browser's site settings.");
      } else if (["network", "service-not-allowed", "language-not-supported"].includes(e.error)) {
        // Browser exposes the API but its speech service is unavailable
        // (Brave, some Chromium builds): use the server-side fallback.
        fellBackRef.current = true;
        startRecorder();
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setVoiceError("Voice input stopped unexpectedly. Try again.");
      }
    };
    rec.onend = () => {
      if (!fellBackRef.current) setListening(false);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const autoGrow = (el) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSend = () => {
    if (!canSend) return;
    recognitionRef.current?.stop();
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
    <div className="relative z-10 max-w-3xl mx-auto w-full px-4 pb-6 pt-2">
      <div className={`glass composer-shell rounded-3xl p-2 ${listening ? "is-listening" : ""}`}>
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
                className="pop-in absolute left-0 bottom-full mb-2 w-56 rounded-2xl border border-ink/10 bg-paper shadow-lg overflow-hidden z-20"
              >
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setCameraOpen(true);
                  }}
                  className="press w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-ink transition-colors duration-150 hover:bg-ink/5"
                >
                  <span className="w-7 h-7 rounded-full bg-mauve/30 text-accent flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 8h3l2-3h6l2 3h3v11H4V8Z" />
                      <circle cx="12" cy="13" r="3.5" strokeWidth={1.75} />
                    </svg>
                  </span>
                  <span>
                    Camera
                    <span className="block text-xs text-slate">Take a picture right now</span>
                  </span>
                </button>
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
                    <span className="block text-xs text-slate">Pick an image from your device</span>
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
                    <span className="block text-xs text-slate">PDF, DOCX, TXT or MD</span>
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
              accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
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
            placeholder={transcribing ? "Transcribing your voice..." : listening ? "Listening... speak your doubt" : "Ask anything..."}
            className="flex-1 resize-none bg-transparent text-ink text-sm placeholder:text-slate/70 focus:outline-none py-2 max-h-[200px]"
          />

          <button
            type="button"
            onClick={toggleVoice}
            disabled={transcribing}
            title={listening ? "Stop listening" : "Speak your doubt"}
            aria-pressed={listening}
            className={`press mic-btn shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150 disabled:opacity-40 ${
              listening ? "is-on text-white bg-flag" : "text-slate hover:text-ink hover:bg-ink/5"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <rect x="9" y="3" width="6" height="11" rx="3" strokeWidth={1.75} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            title="Send"
            className={`press shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-accent text-paper disabled:opacity-30 transition-[opacity,transform] duration-150 hover:opacity-90 shadow-sm ${canSend ? "send-ready" : ""}`}
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
      {voiceError && (
        <p className="fade-in text-center text-xs text-flag mt-2" role="alert">
          {voiceError}
        </p>
      )}
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(f) => {
            setCameraOpen(false);
            pickFile(f);
          }}
        />
      )}
    </div>
  );
}
