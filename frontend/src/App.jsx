import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Roadmap from "./pages/Roadmap.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Whenever the route (or the ?session= id) changes, close the mobile
  // drawer — picking a chat or nav link should return you to the content.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden lg:flex-row lg:gap-4 lg:p-4">
      {!isLogin && (
        <>
          {/* Mobile-only top bar with hamburger — hidden at lg and up, where
              the sidebar is always visible instead. */}
          <header className="shrink-0 flex items-center gap-3 px-4 py-3 glass-strong lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="press w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-ink hover:bg-ink/5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <span className="w-6 h-6 rounded-md bg-accent text-paper flex items-center justify-center font-display text-xs font-semibold">
              D
            </span>
            <span className="font-display text-base tracking-tight text-ink">
              doubt<span className="text-accent">/</span>tutor
            </span>
          </header>

          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </>
      )}

      <main
        className={`flex-1 min-w-0 min-h-0 ${
          isLogin
            ? "overflow-y-auto"
            : "overflow-y-auto themed-scroll lg:rounded-3xl"
        }`}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmap"
            element={
              <ProtectedRoute>
                <Roadmap />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
