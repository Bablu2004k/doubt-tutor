import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Roadmap from "./pages/Roadmap.jsx";
import Login from "./pages/Login.jsx";

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-transparent flex gap-4 p-4">
      {!isLogin && <Sidebar />}
      <main
        className={`flex-1 min-w-0 ${isLogin ? "" : "h-[calc(100vh-2rem)] overflow-y-auto themed-scroll rounded-3xl"}`}
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
