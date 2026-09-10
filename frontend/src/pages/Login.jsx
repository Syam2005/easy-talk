import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../context/AuthContext.jsx";
import { MessageCircle, Clock, Sparkles } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex bg-midnight-950 font-body">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-midnight-900 flex-col justify-between p-12">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-signal-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-chat bg-signal-500 flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white tracking-tight">Easy Talk</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Conversations that keep up with your time, not just your inbox.
          </h1>
          <p className="text-mist text-sm leading-relaxed mb-8">
            Real-time messaging with two things basic chat apps skip: scheduling a message
            for later, and a one-tap summary when a thread gets long.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={15} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Schedule it for later</p>
                <p className="text-xs text-mist/70">Queue a message now, it lands exactly when you meant it to.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-signal-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={15} className="text-signal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Catch up in seconds</p>
                <p className="text-xs text-mist/70">AI summarizes a long thread into the three things that mattered.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-mist/40">Self-hosted · No usage limits</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-9 w-9 rounded-chat bg-signal-500 flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">Easy Talk</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-mist/60 mb-8">Sign in to keep the conversation going.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-mist/70 mb-1.5 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-midnight-800 border border-midnight-600 px-4 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-mist/70 mb-1.5 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-midnight-800 border border-midnight-600 px-4 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-signal-500 hover:bg-signal-400 transition-colors py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-mist/60 mt-6 text-center">
            New here?{" "}
            <Link to="/register" className="text-signal-400 hover:text-signal-300 font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
