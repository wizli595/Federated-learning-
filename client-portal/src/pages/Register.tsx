import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ShieldCheck, Check, Copy, ChevronRight, Loader2, Lock,
  Zap, Users, Wifi, ArrowRight, LogIn, UserPlus,
} from "lucide-react";
import { registerClient, clientStatus, type RegisterResponse } from "../services/api";

// ── Step bar ───────────────────────────────────────────────────────────────────

const STEPS = ["Register", "Upload Data", "Train & Test"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < current
                  ? "bg-indigo-600 text-white"
                  : i === current
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 glow-indigo"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700",
              ].join(" ")}
            >
              {i < current ? <Check size={13} /> : i + 1}
            </div>
            <span className={[
              "text-[10px] font-medium whitespace-nowrap",
              i === current ? "text-indigo-400" : "text-zinc-600",
            ].join(" ")}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={[
              "h-px w-14 sm:w-20 mx-2 mb-5 transition-all",
              i < current ? "bg-indigo-600" : "bg-zinc-800",
            ].join(" ")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────

function SuccessScreen({ result }: { result: RegisterResponse }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  function copy() {
    navigator.clipboard.writeText(result.client_id).then(() => {
      setCopied(true);
      toast.success("Client ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="animate-pop space-y-5">
      {/* Check icon */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Check size={28} className="text-emerald-400" />
          </div>
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100">You're in!</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Welcome, <span className="text-zinc-300 font-semibold">{result.name}</span>. Your node is registered.
        </p>
      </div>

      {/* Client ID */}
      <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/60 p-4">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
          Your Client ID
        </p>
        <div className="flex items-center justify-between gap-3">
          <code className="text-lg font-mono font-bold text-indigo-400 tracking-wide">
            {result.client_id}
          </code>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-zinc-700/60 border border-zinc-600 text-zinc-300
                       hover:bg-zinc-700 hover:border-zinc-500 hover:text-zinc-100
                       transition-all"
          >
            {copied
              ? <><Check size={12} className="text-emerald-400" /> Copied</>
              : <><Copy size={12} /> Copy</>}
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-2">
          Save this ID — you'll need it to log back in.
        </p>
      </div>

      {/* Next step CTA */}
      <button
        onClick={() => navigate(`/dashboard/${result.client_id}`)}
        className="w-full py-3.5 rounded-xl font-semibold text-sm
                   bg-gradient-to-r from-indigo-600 to-violet-600
                   hover:from-indigo-500 hover:to-violet-500
                   text-white shadow-lg shadow-indigo-500/20
                   transition-all flex items-center justify-center gap-2"
      >
        <ArrowRight size={15} /> Upload Dataset <ChevronRight size={14} />
      </button>

      <button
        onClick={() => window.location.reload()}
        className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition py-1"
      >
        Register another client
      </button>
    </div>
  );
}

// ── Login tab ──────────────────────────────────────────────────────────────────

function LoginTab() {
  const [id,      setId]      = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) { toast.error("Enter your client ID."); return; }
    setLoading(true);
    const tid = toast.loading("Looking up your node…");
    try {
      await clientStatus(trimmed);
      toast.success("Found! Loading your dashboard…", { id: tid });
      navigate(`/dashboard/${trimmed}`);
    } catch {
      toast.error("Client ID not found. Check your ID or register a new one.", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Welcome back</h2>
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
          Enter your Client ID to continue to your dashboard.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
          Client ID
        </label>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g. alice, acme-corp, lab-node-1"
          autoFocus
          className="w-full px-4 py-3 rounded-xl
                     bg-zinc-800/60 border border-zinc-700/60
                     text-zinc-100 placeholder-zinc-600 text-sm font-mono
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                     focus:border-indigo-500/60 transition-all"
        />
        <p className="text-[11px] text-zinc-600 mt-2">
          Your Client ID was shown on the registration success screen.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl font-semibold text-sm
                   bg-gradient-to-r from-indigo-600 to-violet-600
                   hover:from-indigo-500 hover:to-violet-500
                   text-white shadow-lg shadow-indigo-500/20
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all flex items-center justify-center gap-2"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Looking up…</>
          : <><LogIn size={15} /> Enter Dashboard <ChevronRight size={14} /></>}
      </button>
    </form>
  );
}

// ── Registration form ──────────────────────────────────────────────────────────

export default function Register() {
  const [tab,     setTab]     = useState<"login" | "register">("register");
  const [name,    setName]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<RegisterResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your client name.");
      return;
    }

    const tid = toast.loading("Registering your node…");
    setLoading(true);

    try {
      const res = await registerClient({ name: name.trim() });
      toast.success(`'${res.name}' registered as ${res.client_id}`, { id: tid });
      setResult(res);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })
          ?.response?.data?.detail ?? "Registration failed. Is the controller online?";
      toast.error(msg, { id: tid });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center
                        shadow-lg shadow-indigo-500/30">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-zinc-100 leading-none">SpamFL</span>
          <p className="text-[11px] text-indigo-400 font-medium leading-none mt-0.5">Client Portal</p>
        </div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md animate-fade-up"
           style={{ animationDelay: "60ms" }}>
        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-xl
                        border border-white/[0.07]
                        shadow-2xl shadow-black/50 p-7">

          {result ? <SuccessScreen result={result} /> : (
            <>
              {/* Tab bar */}
              <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/60 border border-zinc-700/40 mb-6">
                {([
                  { id: "register" as const, icon: UserPlus, label: "Register" },
                  { id: "login"    as const, icon: LogIn,    label: "Login" },
                ] ).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                                text-xs font-semibold transition-all ${
                      tab === id
                        ? "bg-zinc-700 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              {tab === "login" && <LoginTab />}

              {tab === "register" && (
            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <StepBar current={0} />
                <h2 className="text-xl font-bold text-zinc-100">Join the Federation</h2>
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                  Register your node to participate in collaborative spam detection.
                  Your emails never leave your machine.
                </p>
              </div>

              {/* Name input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice, Acme Corp, Lab Node 1"
                  className="w-full px-4 py-3 rounded-xl
                             bg-zinc-800/60 border border-zinc-700/60
                             text-zinc-100 placeholder-zinc-600 text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                             focus:border-indigo-500/60
                             transition-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500
                           text-white shadow-lg shadow-indigo-500/20
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200
                           flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Registering…</>
                  : <><Zap size={15} /> Join the Federation <ChevronRight size={14} /></>}
              </button>

            </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Privacy footer */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-700
                      animate-fade-up" style={{ animationDelay: "120ms" }}>
        <span className="flex items-center gap-1.5"><Lock size={10} /> Emails stay local</span>
        <span className="text-zinc-800">·</span>
        <span className="flex items-center gap-1.5"><Users size={10} /> Collaborative training</span>
        <span className="text-zinc-800">·</span>
        <span className="flex items-center gap-1.5"><Wifi size={10} /> Only DP-noised weights shared</span>
      </div>
    </div>
  );
}
