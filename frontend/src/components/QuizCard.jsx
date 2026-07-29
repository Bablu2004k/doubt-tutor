import { useState } from "react";

export default function QuizCard({ question, onSubmit }) {
  const [selected, setSelected] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [result, setResult] = useState(null); // { isCorrect, explanation }
  const [submitting, setSubmitting] = useState(false);

  const isMcq = question.options && question.options.length > 0;
  const answer = isMcq ? selected : shortAnswer;

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(answer);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 message-in">
      <span className="text-xs uppercase tracking-wide text-accent font-medium">
        {question.difficulty} · {question.topic}
      </span>
      <p className="text-ink font-medium mt-2 mb-4 leading-relaxed">{question.questionText}</p>

      {isMcq ? (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <button
              key={opt}
              disabled={!!result}
              onClick={() => setSelected(opt)}
              className={`press w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors duration-150 ${
                selected === opt
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-ink/10 text-slate hover:border-ink/30"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <input
          disabled={!!result}
          value={shortAnswer}
          onChange={(e) => setShortAnswer(e.target.value)}
          placeholder="Type your answer"
          className="w-full rounded-xl border border-ink/15 p-3 text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      )}

      {!result && (
        <button
          disabled={!answer.trim() || submitting}
          onClick={handleSubmit}
          className="press mt-4 w-full bg-accent text-paper rounded-xl py-2.5 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-[opacity,transform] duration-150"
        >
          {submitting ? "Checking..." : "Submit answer"}
        </button>
      )}

      {result && (
        <div
          className={`message-in mt-4 rounded-xl p-4 text-sm ${
            result.isCorrect ? "bg-signal/10 text-signal" : "bg-flag/10 text-flag"
          }`}
        >
          <p className="font-medium mb-1">{result.isCorrect ? "Correct" : "Not quite"}</p>
          <p className="text-slate">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}
