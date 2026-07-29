import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="glass rounded-3xl p-8 w-full max-w-sm message-in"
      >
        <p className="font-display text-xl text-ink mb-1">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </p>
        <p className="text-slate text-sm mb-6">
          {mode === "login" ? "Log in to keep your roadmap" : "Takes about 10 seconds"}
        </p>

        {mode === "register" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full mb-3 rounded-xl border border-ink/15 p-3 text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="w-full mb-3 rounded-xl border border-ink/15 p-3 text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="w-full mb-4 rounded-xl border border-ink/15 p-3 text-sm text-ink placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-flag text-sm mb-3">{error}</p>}

        <button
          disabled={loading}
          className="press w-full bg-accent text-paper rounded-xl py-3 font-medium disabled:opacity-40 hover:opacity-90 transition-[opacity,transform] duration-150"
        >
          {loading ? "Please wait..." : mode === "login" ? "Log in" : "Register"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="press w-full text-center text-sm text-slate mt-4 hover:text-ink transition-colors duration-150"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
