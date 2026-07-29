const statusStyles = {
  done: "border-signal/30 bg-signal/5",
  active: "border-accent/40 bg-accent/5",
  locked: "border-ink/10 bg-transparent opacity-60",
};

export default function RoadmapPhaseCard({ phase, onComplete }) {
  return (
    <div className={`lift-on-hover glass rounded-2xl border p-5 transition-colors duration-200 ${statusStyles[phase.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate">
          Phase {phase.order} · {phase.durationDays} days
        </span>
        {phase.status === "done" && (
          <span className="text-xs font-medium text-signal">Complete</span>
        )}
      </div>

      <p className="text-ink font-semibold mb-3">{phase.title}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {phase.topics.map((t) => (
          <span
            key={t}
            className="text-xs px-2.5 py-1 rounded-full bg-lilac/25 text-slate border border-ink/10"
          >
            {t}
          </span>
        ))}
      </div>

      <ul className="text-sm text-slate space-y-1 mb-4">
        {phase.checkpoints.map((c) => (
          <li key={c} className="flex gap-2">
            <span className="text-accent">·</span>
            {c}
          </li>
        ))}
      </ul>

      {phase.status === "active" && (
        <button
          onClick={onComplete}
          className="press w-full bg-accent text-paper rounded-xl py-2 text-sm font-medium transition-[opacity,transform] duration-150 hover:opacity-90"
        >
          Mark phase complete
        </button>
      )}
    </div>
  );
}
