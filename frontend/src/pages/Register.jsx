import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../context/AuthContext.jsx";
import { MessageCircle } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell min-h-screen flex items-center justify-center bg-midnight-950 p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-9 w-9 rounded-chat bg-signal-500 flex items-center justify-center">
            <MessageCircle size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">Easy Talk</span>
        </div>

        <h2 className="font-display text-2xl font-bold text-white mb-1 text-center">Create your account</h2>
        <p className="text-sm text-mist/60 mb-8 text-center">Free, self-hosted, no usage limits.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-mist/70 mb-1.5 block">Username</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="janedoe"
              className="w-full rounded-lg bg-midnight-800 border border-midnight-600 px-4 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
            />
          </div>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full rounded-lg bg-midnight-800 border border-midnight-600 px-4 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-signal-500 hover:bg-signal-400 transition-colors py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-mist/60 mt-6 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-signal-400 hover:text-signal-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
