import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DownloadMenu from "./DownloadMenu.jsx";

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const text = String(children).replace(/\n$/, "");

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <pre>
      <button className="code-copy-btn" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <code className={className}>{children}</code>
    </pre>
  );
}

export default function SolutionView({
  problemStatement,
  topic,
  solution,
  onRegenerate,
  regenerating,
  onFollowUp,
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // "up" | "down" | null

  const copySolution = () => {
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const followUps = [
    "Explain that more simply",
    "Show a similar example",
    "What are the edge cases?",
  ];

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3 gap-2">
        <DownloadMenu title={topic || "Doubt answer"} content={solution} />
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              title="Regenerate answer"
              className="press w-7 h-7 rounded-full flex items-center justify-center text-slate transition-colors duration-150 hover:text-ink hover:bg-ink/5 disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"
                />
              </svg>
            </button>
          )}
          <button
            onClick={copySolution}
            title="Copy answer"
            className="press w-7 h-7 rounded-full flex items-center justify-center text-slate transition-colors duration-150 hover:text-ink hover:bg-ink/5"
          >
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-signal">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m5 13 4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                <rect x="9" y="9" width="11" height="11" rx="2" strokeWidth={1.75} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="solution-prose text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre: ({ children }) => {
              // children is a single <code> element from remark; unwrap it
              // so CodeBlock can own the <pre> and float a copy button on it.
              const codeEl = Array.isArray(children) ? children[0] : children;
              return <CodeBlock className={codeEl?.props?.className}>{codeEl?.props?.children}</CodeBlock>;
            },
          }}
        >
          {solution}
        </ReactMarkdown>
      </div>

      {onFollowUp && (
        <div className="flex flex-wrap gap-2 mt-5">
          {followUps.map((f) => (
            <button
              key={f}
              onClick={() => onFollowUp(f)}
              className="press text-xs px-3 py-1.5 rounded-full border border-ink/10 text-ink/70 transition-colors duration-150 hover:border-accent/40 hover:text-accent"
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-ink/10">
        <span className="text-xs text-slate mr-1">Was this helpful?</span>
        <button
          onClick={() => setFeedback("up")}
          title="Helpful"
          className={`press w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150 ${
            feedback === "up" ? "bg-signal/15 text-signal" : "text-slate hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4.5-7.5a1.5 1.5 0 0 1 2.7 1.2L13 9h5.5a2 2 0 0 1 1.9 2.6l-2 6A2 2 0 0 1 16.5 19H7"
            />
          </svg>
        </button>
        <button
          onClick={() => setFeedback("down")}
          title="Not helpful"
          className={`press w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150 ${
            feedback === "down" ? "bg-flag/15 text-flag" : "text-slate hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Zm0 0-4.5 7.5a1.5 1.5 0 0 1-2.7-1.2L11 15H5.5a2 2 0 0 1-1.9-2.6l2-6A2 2 0 0 1 7.5 5H17"
            />
          </svg>
        </button>
        {feedback && <span className="text-xs text-slate">Thanks for the feedback!</span>}
      </div>
    </div>
  );
}
