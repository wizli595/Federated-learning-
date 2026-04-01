import { useState, type FormEvent } from "react";
import { useNavigate }         from "react-router-dom";
import { ShieldAlert, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login }           = useAuth();
  const navigate            = useNavigate();
  const [code,    setCode]  = useState("");
  const [show,    setShow]  = useState(false);
  const [error,   setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      await login(code.trim());
      navigate("/clients", { replace: true });
    } catch {
      setError("Invalid access code. Try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20
                          flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 font-mono">SpamFL</h1>
          <p className="text-zinc-500 text-sm mt-1">Federated Learning Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={16} className="text-zinc-400" />
            <span className="text-zinc-300 text-sm font-medium">Enter access code</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••••••"
                autoFocus
                className={[
                  "w-full bg-zinc-800 border rounded-lg px-4 py-3 pr-12",
                  "text-zinc-100 placeholder-zinc-600 font-mono text-sm",
                  "focus:outline-none focus:ring-2 focus:border-transparent transition",
                  error
                    ? "border-red-500/50 focus:ring-red-500/30"
                    : "border-zinc-700 focus:ring-blue-500/30",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500
                           hover:text-zinc-300 transition"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className={[
                "w-full py-3 rounded-lg font-medium text-sm transition",
                "bg-blue-600 hover:bg-blue-500 text-white",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {loading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Set <code className="text-zinc-500">ACCESS_CODE</code> in <code className="text-zinc-500">.env</code>
        </p>
      </div>
    </div>
  );
}
