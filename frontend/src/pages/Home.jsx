import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useSearchParams } from "react-router-dom";
import ChatMessage from "../components/ChatMessage.jsx";
import ChatComposer from "../components/ChatComposer.jsx";
import SolutionView from "../components/SolutionView.jsx";
import QuizCard from "../components/QuizCard.jsx";
import AmbientOrb from "../components/AmbientOrb.jsx";
import HeroOrb from "../components/HeroOrb.jsx";
import { problemApi, attemptApi } from "../api/api.js";

let idCounter = 0;
const nextId = () => `m${++idCounter}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const openSessionId = searchParams.get("session");
  // The chat currently on screen — every follow-up sent while this is set
  // gets tagged with the same id, so they land in one "Recent doubts"
  // entry instead of spawning a new one each time. Cleared only by
  // "New doubt".
  const sessionIdRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  const addMessage = (msg) => {
    const id = nextId();
    setMessages((prev) => [...prev, { id, ...msg }]);
    scrollToBottom();
    return id;
  };

  const updateMessage = (id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    scrollToBottom();
  };

  // "New chat" in the sidebar dispatches this — handles it even when we're
  // already on "/" (no route change to hook into) or mid-way through a past
  // doubt, both of which used to leave the old conversation on screen.
  useEffect(() => {
    const onNewChat = () => {
      setMessages([]);
      setLoading(false);
      setLoadingHistory(false);
      sessionIdRef.current = null;
      if (searchParams.get("session")) setSearchParams({});
    };
    window.addEventListener("chat:new", onNewChat);
    return () => window.removeEventListener("chat:new", onNewChat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link into a past chat from the sidebar's "Recent doubts" list —
  // loads every turn of that conversation, not just the last one.
  useEffect(() => {
    if (!openSessionId) return;
    setLoadingHistory(true);
    setMessages([]);
    sessionIdRef.current = openSessionId;
    problemApi
      .getSession(openSessionId)
      .then(({ data }) => {
        const turns = data.flatMap((problem) => [
          {
            id: nextId(),
            role: "user",
            text: problem.sourceType === "text" ? problem.rawText : "📷 Photo problem",
          },
          {
            id: nextId(),
            role: "assistant",
            status: "done",
            problem,
            originalInput: { text: problem.rawText, file: null },
          },
        ]);
        setMessages(turns);
      })
      .catch(() => setMessages([]))
      .finally(() => {
        setLoadingHistory(false);
        scrollToBottom();
      });
  }, [openSessionId]);

  const runCreateProblem = async ({ text, file }) => {
    return file
      ? problemApi.createFromImage(file, "DSA", sessionIdRef.current)
      : problemApi.createFromText(text, "DSA", sessionIdRef.current);
  };

  const handleSend = async ({ text, file }) => {
    addMessage({
      role: "user",
      text: text || null,
      imagePreview: file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      fileName: file && !file.type.startsWith("image/") ? file.name : null,
    });

    const assistantId = addMessage({ role: "assistant", status: "loading" });
    setLoading(true);

    try {
      const { data } = await runCreateProblem({ text, file });
      updateMessage(assistantId, { status: "done", problem: data, originalInput: { text, file } });
      // First turn of a brand-new chat: lock in its sessionId so every
      // follow-up in this conversation reuses it, and reflect it in the
      // URL so refreshing/sharing the link reopens the whole chat.
      if (!sessionIdRef.current) {
        sessionIdRef.current = data.sessionId;
        setSearchParams({ session: data.sessionId });
      }
      window.dispatchEvent(new Event("problem:created"));
    } catch (err) {
      updateMessage(assistantId, {
        status: "error",
        error: err.response?.data?.message || "Couldn't work through that one, try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (messageId, originalInput) => {
    updateMessage(messageId, { regenerating: true });
    try {
      const { data } = await runCreateProblem(originalInput || {});
      updateMessage(messageId, { problem: data, regenerating: false });
      window.dispatchEvent(new Event("problem:created"));
    } catch {
      updateMessage(messageId, { regenerating: false });
    }
  };

  const handleFollowUp = (prompt) => handleSend({ text: prompt, file: null });

  const handleGenerateQuestion = async (messageId, problemId) => {
    updateMessage(messageId, { quizLoading: true });
    try {
      const { data } = await problemApi.generateQuestion(problemId, "medium");
      updateMessage(messageId, { question: data, quizLoading: false });
    } catch {
      updateMessage(messageId, { quizLoading: false });
    }
  };

  const handleAnswer = async (questionId, answer) => {
    const { data } = await attemptApi.submit(questionId, answer);
    return { isCorrect: data.isCorrect, explanation: data.explanation };
  };

  // Drag a photo in from anywhere on the page
  const onDrop = useCallback((accepted) => {
    const file = accepted?.[0];
    if (file) handleSend({ text: "", file });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
    noClick: true,
  });

  const isEmpty = messages.length === 0 && !loadingHistory;

  return (
    <div {...getRootProps()} className="h-full flex flex-col relative">
      {isDragActive && (
        <div
          style={{ "--pop-origin": "center" }}
          className="pop-in absolute inset-0 z-10 bg-accent/10 border-4 border-dashed border-accent m-4 rounded-3xl flex items-center justify-center pointer-events-none"
        >
          <p className="text-accent font-display text-xl">Drop your photo to break it down</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto themed-scroll relative">
        <AmbientOrb active={loading} />

        {loadingHistory ? (
          <div className="h-full flex items-center justify-center relative z-[1]">
            <p className="text-slate text-sm">Loading that doubt...</p>
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center relative z-[1]">
            <HeroOrb />
            <p className="font-display text-2xl text-ink">
              {greeting()}. What's <span className="text-accent">stuck</span> in your head today?
            </p>
            <p className="text-slate mt-1 max-w-sm">
              Upload a photo of your problem or type it in — I'll work through it with you, then quiz you on it.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {[
                { title: "Explain a concept", sub: "Break it down simply", cls: "doubt-chip--explain", text: "Explain recursion with an example" },
                { title: "Debug my code", sub: "Paste or photo it", cls: "doubt-chip--debug", text: "Debug my segfault" },
                { title: "Quiz me", sub: "Test what I know", cls: "doubt-chip--quiz", text: "Quiz me on Big-O" },
                { title: "Build a roadmap", sub: "Plan my prep", cls: "doubt-chip--roadmap", text: "Help me build a DSA prep roadmap" },
              ].map((c, i) => (
                <button
                  key={c.title}
                  onClick={() => handleSend({ text: c.text, file: null })}
                  style={{ "--stagger-index": i }}
                  className={`press stagger-in doubt-chip ${c.cls}`}
                >
                  <span className="doubt-chip__title">{c.title}</span>
                  <span className="doubt-chip__sub">{c.sub}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 relative z-[1]">
            {messages.map((m) => (
              <ChatMessage key={m.id} role={m.role}>
                {m.role === "user" ? (
                  <>
                    {m.imagePreview && (
                      <img
                        src={m.imagePreview}
                        alt="Uploaded problem"
                        className="max-h-56 rounded-xl mb-2 border border-white/20"
                      />
                    )}
                    {m.fileName && (
                      <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 mb-2 text-white/90">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 shrink-0">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.75}
                            d="M9 3h4l6 6v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 0v6h6"
                          />
                        </svg>
                        <span className="text-xs truncate">{m.fileName}</span>
                      </div>
                    )}
                    {m.text && <p>{m.text}</p>}
                  </>
                ) : (
                  <AssistantTurn
                    message={m}
                    onGenerateQuestion={() => handleGenerateQuestion(m.id, m.problem._id)}
                    onAnswer={handleAnswer}
                    onRegenerate={() => handleRegenerate(m.id, m.originalInput)}
                    onFollowUp={handleFollowUp}
                  />
                )}
              </ChatMessage>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatComposer onSend={handleSend} loading={loading} />
    </div>
  );
}

function AssistantTurn({ message, onGenerateQuestion, onAnswer, onRegenerate, onFollowUp }) {
  if (message.status === "loading") {
    return (
      <div className="flex items-center gap-1.5 py-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    );
  }

  if (message.status === "error") {
    return <p className="text-flag text-sm">{message.error}</p>;
  }

  const { problem, question, quizLoading, regenerating } = message;

  return (
    <>
      <SolutionView
        problemStatement={problem.problemStatement}
        topic={problem.topic}
        solution={problem.solution}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        onFollowUp={onFollowUp}
      />

      {!question && (
        <button
          onClick={onGenerateQuestion}
          disabled={quizLoading}
          className="press w-full border border-ink/15 text-ink rounded-2xl py-3 font-medium transition-colors duration-150 hover:bg-ink/5 disabled:opacity-40"
        >
          {quizLoading ? "Generating..." : "Test yourself on this topic"}
        </button>
      )}

      {question && (
        <QuizCard question={question} onSubmit={(answer) => onAnswer(question._id, answer)} />
      )}
    </>
  );
}
