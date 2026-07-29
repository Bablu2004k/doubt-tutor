import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { problemApi } from "../api/api.js";

const links = [
  {
    to: "/roadmap",
    label: "Roadmap",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 4.5 4 7v12.5l5-2.5 6 2.5 5-2.5V4.5l-5 2.5-6-2.5Zm0 0v14.5m6-12v14.5"
      />
    ),
  },
];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeSessionId = searchParams.get("session");

  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadRecent = async () => {
    try {
      const { data } = await problemApi.list();
      setRecent(data.slice(0, 20));
    } catch {
      // quietly ignore — history is a nice-to-have, not critical path
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (user) loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Pick up newly-created problems without a full reload
  useEffect(() => {
    const onCreated = () => loadRecent();
    window.addEventListener("problem:created", onCreated);
    return () => window.removeEventListener("problem:created", onCreated);
  }, []);

  const startNewChat = () => {
    // Always land on a blank composer — even if we're already on "/", or
    // deep inside a past chat (?session=...), which navigate("/") alone
    // won't reset since the route doesn't remount.
    window.dispatchEvent(new Event("chat:new"));
    navigate("/", { replace: true });
    onClose();
  };

  const handlePin = async (e, session) => {
    e.stopPropagation();
    setBusyId(session.sessionId);
    // optimistic update, then re-sort pinned-first
    setRecent((prev) =>
      [
        ...prev.map((s) =>
          s.sessionId === session.sessionId ? { ...s, pinned: !s.pinned } : s
        ),
      ].sort((a, b) => (b.pinned === a.pinned ? 0 : b.pinned ? 1 : -1))
    );
    try {
      await problemApi.toggleSessionPin(session.sessionId);
    } catch {
      loadRecent(); // roll back to server truth on failure
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (e, session) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${session.topic}"? This can't be undone.`)) return;
    setBusyId(session.sessionId);
    const prevRecent = recent;
    setRecent((r) => r.filter((s) => s.sessionId !== session.sessionId));
    try {
      await problemApi.removeSession(session.sessionId);
      if (activeSessionId === session.sessionId) startNewChat();
    } catch {
      setRecent(prevRecent); // roll back on failure
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {/* Backdrop — only rendered (and only intercepts taps) on mobile while
          the drawer is open; desktop never shows it since the sidebar is
          always visible there. */}
      {open && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85vw] max-w-72 h-[100dvh] glass-strong flex flex-col overflow-hidden transition-transform duration-300 ease-[var(--ease-drawer)]
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:translate-x-0 lg:z-auto lg:w-72 lg:max-w-none lg:shrink-0 lg:h-[calc(100dvh-2rem)] lg:rounded-3xl`}
      >
        <div className="px-5 py-5 flex items-center gap-2 border-b border-ink/10">
          <span className="w-7 h-7 rounded-lg bg-accent text-paper flex items-center justify-center font-display text-sm font-semibold">
            D
          </span>
          <span className="font-display text-lg tracking-tight text-ink">
            doubt<span className="text-accent">/</span>tutor
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="press ml-auto w-8 h-8 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/5 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4.5 h-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

      <nav className="px-3 pt-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onClose}
            className={({ isActive }) =>
              `press flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
                isActive
                  ? "bg-ink/8 text-ink font-medium"
                  : "text-ink/60 hover:text-ink hover:bg-ink/5"
              }`
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4.5 h-4.5 w-[18px] h-[18px]">
              {link.icon}
            </svg>
            {link.label}
          </NavLink>
        ))}

        <button
          onClick={startNewChat}
          className={`press w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
            location.pathname === "/" && !activeSessionId
              ? "bg-ink/8 text-ink font-medium"
              : "text-ink/60 hover:text-ink hover:bg-ink/5"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[18px] h-[18px]">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 5v14M5 12h14" />
          </svg>
          New doubt
        </button>
      </nav>

      <div className="px-5 pt-5 pb-2 text-xs font-medium uppercase tracking-wide text-ink/40">Recent doubts</div>
      <div className="flex-1 overflow-y-auto themed-scroll px-3 pb-3 space-y-1">
        {loadingRecent && <p className="px-3 text-xs text-ink/40">Loading...</p>}
        {!loadingRecent && recent.length === 0 && (
          <p className="px-3 text-xs text-ink/40">Nothing here yet — ask your first doubt!</p>
        )}
        {recent.map((p, i) => (
          <div
            key={p.sessionId}
            onClick={() => {
              navigate(`/?session=${p.sessionId}`);
              onClose();
            }}
            style={{ "--stagger-index": Math.min(i, 8) }}
            className={`stagger-in group relative w-full text-left px-3 py-2 rounded-xl transition-colors duration-150 cursor-pointer ${
              activeSessionId === p.sessionId ? "bg-ink/8" : "hover:bg-ink/5"
            } ${busyId === p.sessionId ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-ink truncate flex items-center gap-1.5">
                  {p.pinned && (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-accent shrink-0">
                      <path d="M14.5 2.5a1 1 0 0 1 1.41 0l5.59 5.59a1 1 0 0 1 0 1.41l-3.3 3.3.9 4.5a1 1 0 0 1-1.68.92l-3.94-3.53-4.5 4.5a.75.75 0 0 1-1.06-1.06l4.5-4.5-3.53-3.94a1 1 0 0 1 .92-1.68l4.5.9 3.3-3.3Z" />
                    </svg>
                  )}
                  <span className="truncate">{p.topic}</span>
                </p>
                <p className="text-xs text-ink/45 truncate">
                  {p.problemStatement} · {timeAgo(p.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                <button
                  onClick={(e) => handlePin(e, p)}
                  title={p.pinned ? "Unpin" : "Pin"}
                  className={`press p-1 rounded-lg transition-colors duration-150 hover:bg-ink/10 ${p.pinned ? "text-accent" : "text-ink/40 hover:text-ink"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M12 17v5m-5-9.5V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6.5l1.6 2.1a.9.9 0 0 1-.72 1.4H6.12a.9.9 0 0 1-.72-1.4L7 12.5Z"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(e, p)}
                  title="Delete"
                  className="press p-1 rounded-lg text-ink/40 transition-colors duration-150 hover:text-flag hover:bg-flag/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H9.7a2 2 0 0 1-2-1.9L7 7h10Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-4 border-t border-ink/10">
        {user ? (
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-signal/20 text-signal flex items-center justify-center text-xs font-semibold shrink-0">
                {user.name?.[0]?.toUpperCase() || "?"}
              </span>
              <span className="text-sm text-ink/80 truncate">{user.name}</span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Log out"
              className="press shrink-0 p-1.5 rounded-lg text-ink/50 transition-colors duration-150 hover:text-ink hover:bg-ink/10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M15 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 12h10m0 0-3-3m3 3-3 3"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="press w-full text-sm px-3 py-2 rounded-xl bg-accent text-paper transition-[opacity,transform] duration-150 hover:opacity-90"
          >
            Log in
          </button>
        )}
      </div>
      </aside>
    </>
  );
}
