import { useEffect, useState } from "react";
import RoadmapPhaseCard from "../components/RoadmapPhaseCard.jsx";
import DownloadMenu from "../components/DownloadMenu.jsx";
import AmbientOrb from "../components/AmbientOrb.jsx";
import { roadmapApi } from "../api/api.js";

// Turns a roadmap into a clean markdown document — reused for the
// Markdown/PDF/Word download buttons.
function roadmapToMarkdown(roadmap) {
  const lines = [`**${roadmap.weeks}-week plan**`, ""];
  roadmap.phases.forEach((phase) => {
    lines.push(`## Phase ${phase.order}: ${phase.title} (${phase.durationDays} days)`);
    lines.push(`Status: ${phase.status}`);
    if (phase.topics?.length) {
      lines.push("", "**Topics**");
      phase.topics.forEach((t) => lines.push(`- ${t}`));
    }
    if (phase.checkpoints?.length) {
      lines.push("", "**Checkpoints**");
      phase.checkpoints.forEach((c) => lines.push(`- ${c}`));
    }
    lines.push("");
  });
  return lines.join("\n");
}

export default function Roadmap() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [goal, setGoal] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [error, setError] = useState("");

  const roadmap = roadmaps.find((r) => r._id === activeId) || null;

  const loadAll = async () => {
    try {
      const { data } = await roadmapApi.list();
      setRoadmaps(data);
      setActiveId((current) => (current && data.some((r) => r._id === current) ? current : data[0]?._id ?? null));
      setShowForm(data.length === 0);
    } catch {
      setRoadmaps([]);
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await roadmapApi.create(goal, Number(weeks));
      setRoadmaps((prev) => [data, ...prev]);
      setActiveId(data._id);
      setShowForm(false);
      setGoal("");
      setWeeks(4);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't build a roadmap, try again");
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async () => {
    setCreating(true);
    try {
      const { data } = await roadmapApi.regenerate(roadmap._id);
      setRoadmaps((prev) => prev.map((r) => (r._id === data._id ? data : r)));
    } finally {
      setCreating(false);
    }
  };

  const handleCompletePhase = async (order) => {
    const { data } = await roadmapApi.completePhase(roadmap._id, order);
    setRoadmaps((prev) => prev.map((r) => (r._id === data._id ? data : r)));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this roadmap? This can't be undone.")) return;
    const prev = roadmaps;
    const next = roadmaps.filter((r) => r._id !== id);
    setRoadmaps(next);
    if (activeId === id) {
      setActiveId(next[0]?._id ?? null);
      setShowForm(next.length === 0);
    }
    try {
      await roadmapApi.remove(id);
    } catch {
      setRoadmaps(prev); // roll back on failure
    }
  };

  if (loading) {
    return <p className="text-slate text-sm max-w-3xl mx-auto px-6 py-10">Loading...</p>;
  }

  return (
    <div className="relative min-h-full">
      <AmbientOrb active={creating} />

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6 relative z-[1]">
        <div>
          <p className="font-display text-2xl text-ink">Roadmap</p>
          <p className="text-slate mt-1">A phased plan that adapts as your weak topics change.</p>
        </div>

        {/* Goal switcher — this is the bit that was missing: pick between
           roadmaps you've already built, or start a brand new one without
           losing the others. */}
        {roadmaps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {roadmaps.map((r) => (
              <div key={r._id} className="group relative">
                <button
                  onClick={() => {
                    setActiveId(r._id);
                    setShowForm(false);
                  }}
                  className={`press text-sm pl-4 pr-8 py-2 rounded-full border transition-colors duration-150 truncate max-w-[220px] ${
                    !showForm && activeId === r._id
                      ? "bg-accent text-paper border-accent"
                      : "border-ink/15 text-ink/70 hover:bg-ink/5"
                  }`}
                  title={r.goal}
                >
                  {r.goal}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r._id);
                  }}
                  title="Delete roadmap"
                  className={`press absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-[opacity,color,transform] duration-150 ${
                    !showForm && activeId === r._id ? "text-paper/80 hover:text-paper" : "text-ink/40 hover:text-flag"
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowForm(true)}
              className={`press text-sm px-4 py-2 rounded-full border border-dashed transition-colors duration-150 flex items-center gap-1.5 ${
                showForm ? "border-accent text-accent" : "border-ink/25 text-ink/60 hover:border-accent/50 hover:text-accent"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
              New roadmap
            </button>
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleCreate} className="glass rounded-2xl p-6 space-y-3">
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="I want to learn... (e.g. DSA for placements)"
              autoFocus={roadmaps.length > 0}
              className="w-full rounded-xl border border-ink/15 p-3 text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate">Weeks</label>
              <input
                type="number"
                min={1}
                max={26}
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                className="w-20 rounded-xl border border-ink/15 p-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {error && <p className="text-flag text-sm">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                disabled={creating}
                className="press flex-1 bg-accent text-paper rounded-xl py-3 font-medium disabled:opacity-40 transition-[opacity,transform] duration-150 hover:opacity-90"
              >
                {creating ? "Building your roadmap..." : "Build my roadmap"}
              </button>
              {roadmaps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="press px-4 py-3 rounded-xl border border-ink/15 text-ink/70 transition-colors duration-150 hover:bg-ink/5 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : roadmap ? (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-ink font-medium">{roadmap.goal}</p>
                <p className="text-slate text-sm">{roadmap.weeks} weeks</p>
              </div>
              <div className="flex items-center gap-2">
                <DownloadMenu title={roadmap.goal} content={roadmapToMarkdown(roadmap)} />
                <button
                  onClick={handleRegenerate}
                  disabled={creating}
                  className="press text-sm px-4 py-2 rounded-full border border-ink/15 text-ink transition-colors duration-150 hover:bg-ink/5 disabled:opacity-40"
                >
                  {creating ? "Regenerating..." : "Regenerate roadmap"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {roadmap.phases.map((phase, i) => (
                <div key={phase.order} className="stagger-in" style={{ "--stagger-index": Math.min(i, 8) }}>
                  <RoadmapPhaseCard phase={phase} onComplete={() => handleCompletePhase(phase.order)} />
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
