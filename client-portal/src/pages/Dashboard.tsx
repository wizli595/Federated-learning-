import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ShieldCheck, Upload, Check, Loader2, AlertCircle,
  FileText, ChevronRight, Lock, RefreshCw, X,
  Database, BarChart3, Cpu, ArrowRight, Info,
  Clock, CheckCircle2, AlertTriangle, Send,
  Mail, Paperclip, Shield, TrendingUp,
  Inbox, PenLine, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import {
  clientStatus, uploadDataset, trainingStatus, classifyEmail,
  type ClientStatus, type TrainingStatus, type ClassifyResponse,
} from "../services/api";
import { parseCSV, detectColumns, normalizeLabel, type ColMap } from "../lib/csvParser";
import { extractFeatures, FEATURE_NAMES } from "../lib/featureExtractor";

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase =
  | "loading" | "not-found"
  // Step 2 — upload
  | "idle" | "file-dropped" | "extracting" | "upload-ready" | "uploading"
  // Step 3 — train & test
  | "training-watch" | "model-ready" | "classifying" | "classified";

interface ExtractionResult {
  features:  number[][];
  labels:    number[];
  skipped:   number;
  spamCount: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const BATCH_SIZE = 250;

const PROFILE_STYLES: Record<string, { label: string; badge: string }> = {
  marketing: { label: "Marketing", badge: "bg-indigo-500/15 text-indigo-400" },
  balanced:  { label: "Balanced",  badge: "bg-emerald-500/15 text-emerald-400" },
  phishing:  { label: "Phishing",  badge: "bg-orange-500/15 text-orange-400" },
};

// ── Sample inbox emails ────────────────────────────────────────────────────────

const SAMPLE_EMAILS = [
  {
    id: "spam-1", category: "spam" as const,
    from: "noreply@bigprizes2024.com",
    subject: "YOU'VE WON!!! Claim your FREE $1,000 gift card NOW!!!",
    body: "Congratulations dear customer!\n\nYou have been specially selected to receive a FREE $1,000 Amazon gift card! This is a LIMITED TIME OFFER — click the link below to claim your prize immediately before it expires!!!\n\nhttp://www.claim-prize-now.com/winner\n\nAct NOW! Don't miss this EXCLUSIVE offer. Buy now and save 80% discount! Special bonus gift for you!\n\nUnsubscribe | Contact us",
    sender: "noreply@bigprizes2024.com",
    reply_to: "claims@differentdomain.net",
  },
  {
    id: "spam-2", category: "spam" as const,
    from: "security@paypal-alert.net",
    subject: "URGENT: Your PayPal account has been suspended",
    body: "URGENT ACTION REQUIRED\n\nDear Valued Customer,\n\nWe have detected unusual activity on your account. Your PayPal access has been temporarily limited due to suspicious login attempts.\n\nPlease verify your information IMMEDIATELY to restore full access:\nhttp://www.paypal-secure-verify.net/login\n\nFailure to verify within 24 hours will result in PERMANENT account suspension and loss of funds.\n\nPayPal Security Department",
    sender: "security@paypal-alert.net",
    reply_to: "noreply@paypal-alert.net",
  },
  {
    id: "spam-3", category: "spam" as const,
    from: "loans@fastcash-guaranteed.com",
    subject: "Guaranteed loan approval — $5,000 cash advance today",
    body: "Dear Customer,\n\nYou have been PRE-APPROVED for a $5,000 cash advance! No credit check required. Guaranteed approval within 24 hours. Earn money from home starting today!\n\nSpecial limited-time offer — apply now before this exclusive deal expires!\n\nClaim your loan: www.fast-cash-now.com/apply\n\nUnsubscribe from promotional emails",
    sender: "loans@fastcash-guaranteed.com",
    reply_to: "",
  },
  {
    id: "spam-4", category: "spam" as const,
    from: "winner@lottery-intl.org",
    subject: "Your lottery winning — $850,000 unclaimed",
    body: "CONGRATULATIONS!!!\n\nWe are pleased to inform you that your email has WON $850,000 USD in our online international lottery promotion. Your email was randomly selected from millions of global entries.\n\nTo claim your prize URGENTLY contact our agent:\nEmail: agent@lottery-claims.net\nPhone: +44 7911 123456\n\nWARNING: Keep this strictly confidential until funds are released.\n\nMr. James Wilson — Lottery International",
    sender: "winner@lottery-intl.org",
    reply_to: "agent@lottery-claims.net",
  },
  {
    id: "ham-1", category: "ham" as const,
    from: "sarah.jones@company.com",
    subject: "Q4 planning meeting — Tuesday 2pm",
    body: "Hi team,\n\nJust a reminder about our Q4 planning meeting scheduled for Tuesday at 2pm in conference room B.\n\nPlease come prepared with:\n- Department progress updates for the quarter\n- Budget proposals for Q1\n- Any blockers or cross-team dependencies\n\nLet me know if you have any conflicts or questions.\n\nBest,\nSarah",
    sender: "sarah.jones@company.com",
    reply_to: "",
  },
  {
    id: "ham-2", category: "ham" as const,
    from: "ship-confirm@amazon.com",
    subject: "Your order has been shipped — arrives Monday",
    body: "Hello,\n\nGood news! Your order #112-3456789-0987654 has been shipped and is on its way to you.\n\nEstimated delivery: Monday, April 7\nTracking number: 1Z999AA10123456784\nCarrier: UPS\n\nItems shipped:\n- USB-C Cable 2-pack\n- Adjustable Laptop Stand\n\nYou can track your package using the link in your account.\n\nThank you for shopping with us.\nAmazon Customer Service",
    sender: "ship-confirm@amazon.com",
    reply_to: "",
  },
  {
    id: "ham-3", category: "ham" as const,
    from: "notifications@github.com",
    subject: "Pull request #247 approved — ready to merge",
    body: "Your pull request was approved by a reviewer.\n\nfix: correct authentication middleware path matching\nRepository: org/spamfl\nReviewed by: @dev-lead\nStatus: Approved ✓\n\nYou can now merge your pull request into main.\n\nView pull request: github.com/org/spamfl/pull/247\n\n---\nYou are receiving this notification because you opened this pull request.\nManage your notification settings at github.com/settings/notifications",
    sender: "notifications@github.com",
    reply_to: "reply@reply.github.com",
  },
  {
    id: "ham-4", category: "ham" as const,
    from: "mike.chen@gmail.com",
    subject: "Weekend hiking plans?",
    body: "Hey,\n\nAre you free this Saturday? A few of us are planning to go hiking at the state park — should be a great day for it if the weather holds.\n\nWe'd leave around 8am from the parking lot near the trailhead. Bring water and snacks, it's about a 3-hour trail.\n\nLet me know by Thursday so we can sort out the carpool.\n\nCheers,\nMike",
    sender: "mike.chen@gmail.com",
    reply_to: "",
  },
];

interface InboxItem {
  id: string;
  category: "spam" | "ham";
  from: string;
  subject: string;
  body: string;
  sender: string;
  reply_to: string;
  result?: ClassifyResponse;
  classifying?: boolean;
}

// ── Step bar ───────────────────────────────────────────────────────────────────

const STEPS = ["Register", "Upload Data", "Train & Test"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              i < current  ? "bg-indigo-600 text-white"
              : i === current ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 glow-indigo"
              : "bg-zinc-800 text-zinc-500 border border-zinc-700",
            ].join(" ")}>
              {i < current ? <Check size={13} /> : i + 1}
            </div>
            <span className={[
              "text-[10px] font-medium whitespace-nowrap",
              i === current ? "text-indigo-400" : "text-zinc-600",
            ].join(" ")}>{label}</span>
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

// ── Column selector ────────────────────────────────────────────────────────────

function ColSelect({ label, required, value, headers, onChange }: {
  label: string; required?: boolean; value: number;
  headers: string[]; onChange: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0">
        <span className="text-xs font-semibold text-zinc-400">{label}</span>
        {required && <span className="ml-1 text-[10px] text-rose-500">*</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60
                   text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                   focus:border-indigo-500/60 transition-all"
      >
        <option value={-1}>— not mapped —</option>
        {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
      </select>
      {value >= 0
        ? <Check size={14} className="text-emerald-400 shrink-0" />
        : required
          ? <AlertCircle size={14} className="text-rose-500 shrink-0" />
          : <div className="w-3.5 shrink-0" />}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
             style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>{label ?? `${value.toLocaleString()} / ${max.toLocaleString()} rows`}</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

// ── Training status card ───────────────────────────────────────────────────────

function TrainingStatusCard({
  ts, onModelReady,
}: {
  ts: TrainingStatus | null;
  onModelReady: () => void;
}) {
  const status = ts?.status ?? "idle";
  const pct    = ts && ts.total_rounds > 0
    ? Math.round((ts.current_round / ts.total_rounds) * 100)
    : 0;

  useEffect(() => {
    if (ts?.has_global_model) onModelReady();
  }, [ts?.has_global_model]);

  if (!ts) {
    return (
      <div className="flex items-center justify-center py-6 gap-3">
        <Loader2 size={18} className="text-zinc-600 animate-spin" />
        <span className="text-sm text-zinc-500">Checking training status…</span>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
            <Clock size={15} className="text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">Waiting for training to start</p>
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
              The federation coordinator will initiate a training round from the main dashboard.
              This page checks every 5 seconds.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-zinc-800/40 border border-zinc-800 p-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-[11px] text-zinc-600">Polling for updates…</span>
        </div>
      </div>
    );
  }

  if (status === "training") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Cpu size={14} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Training in progress</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Round <span className="text-indigo-400 font-semibold">{ts.current_round}</span>
              {" "}of <span className="font-semibold text-zinc-300">{ts.total_rounds}</span>
            </p>
          </div>
        </div>
        <ProgressBar value={ts.current_round} max={ts.total_rounds}
          label={`Round ${ts.current_round} / ${ts.total_rounds}`} />
        {(ts.avg_accuracy != null || ts.avg_loss != null) && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Accuracy", value: ts.avg_accuracy != null ? `${(ts.avg_accuracy * 100).toFixed(1)}%` : "—" },
              { label: "F1 Score", value: ts.f1 != null ? ts.f1.toFixed(3) : "—" },
              { label: "Loss",     value: ts.avg_loss != null ? ts.avg_loss.toFixed(4) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-zinc-200">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // finished
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Training complete!</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {ts.total_rounds} rounds · {ts.avg_accuracy != null ? `${(ts.avg_accuracy * 100).toFixed(1)}% accuracy` : ""}
            {ts.f1 != null ? ` · F1 ${ts.f1.toFixed(3)}` : ""}
          </p>
        </div>
      </div>
      {ts.has_global_model ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <Shield size={13} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400">Model distributed — loading email tester…</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/40 border border-zinc-800">
          <Loader2 size={13} className="text-zinc-500 animate-spin shrink-0" />
          <p className="text-xs text-zinc-500">Distributing model to clients…</p>
        </div>
      )}
    </div>
  );
}

// ── Classify result display ────────────────────────────────────────────────────

function ClassifyResultCard({ result, onReset }: { result: ClassifyResponse; onReset: () => void }) {
  const isSpam = result.label === "spam";
  const confPct = (result.confidence * 100).toFixed(1);

  // Top features sorted by value desc
  const topFeatures = Object.entries(result.feature_breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="animate-pop space-y-4">
      {/* Verdict */}
      <div className={`rounded-2xl border p-5 text-center ${
        isSpam
          ? "bg-rose-500/5 border-rose-500/30"
          : "bg-emerald-500/5 border-emerald-500/30"
      }`}>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-3 ${
          isSpam
            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
        }`}>
          {isSpam ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {isSpam ? "SPAM" : "HAM — Clean"}
        </div>

        {/* Confidence meter */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-500 px-1">
            <span>Ham</span>
            <span className={`font-bold text-xs ${isSpam ? "text-rose-400" : "text-emerald-400"}`}>
              {confPct}% confidence
            </span>
            <span>Spam</span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden relative">
            <div className="absolute inset-0 flex">
              <div className="h-full bg-emerald-500/30" style={{ width: "50%" }} />
              <div className="h-full bg-rose-500/30" style={{ width: "50%" }} />
            </div>
            <div
              className={`absolute top-0 h-full w-1.5 rounded-full -ml-0.5 shadow-lg ${
                isSpam ? "bg-rose-400 shadow-rose-500/50" : "bg-emerald-400 shadow-emerald-500/50"
              }`}
              style={{ left: `${result.spam_score * 100}%` }}
            />
          </div>
        </div>

        <p className="text-[10px] text-zinc-600 mt-2">
          Model: <span className="text-zinc-400">{result.model_type}</span>
          {" · "}spam score: <span className="text-zinc-400">{(result.spam_score * 100).toFixed(1)}%</span>
        </p>
      </div>

      {/* Feature breakdown */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
          Top signal features
        </p>
        <div className="space-y-1.5">
          {topFeatures.map(([name, val]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-36 shrink-0 text-[10px] text-zinc-500 truncate">{name}</div>
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${val > 0.5 ? "bg-rose-500/60" : "bg-indigo-500/60"}`}
                  style={{ width: `${val * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-[10px] text-zinc-500 shrink-0">
                {val.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-2.5 rounded-xl text-xs font-medium text-zinc-400
                   bg-zinc-800/60 border border-zinc-700 hover:bg-zinc-800
                   transition-all flex items-center justify-center gap-1.5"
      >
        <RefreshCw size={12} /> Test another email
      </button>
    </div>
  );
}

// ── Email test form ────────────────────────────────────────────────────────────

function EmailTester({
  clientId, onResult,
}: {
  clientId: string;
  onResult: (r: ClassifyResponse) => void;
}) {
  const [form, setForm] = useState({
    subject: "", body: "", sender: "", reply_to: "", has_attachment: false,
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.body.trim() && !form.subject.trim()) {
      toast.error("Enter at least a subject or body to classify.");
      return;
    }
    setLoading(true);
    const tid = toast.loading("Classifying…");
    try {
      const result = await classifyEmail(clientId, form);
      toast.success(`Classified as ${result.label.toUpperCase()}`, { id: tid });
      onResult(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Classification failed.";
      toast.error(msg, { id: tid });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
          Subject
        </label>
        <input
          value={form.subject} onChange={e => set("subject")(e.target.value)}
          placeholder="e.g. Congratulations! You've been selected…"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
          Body <span className="text-rose-500">*</span>
        </label>
        <textarea
          value={form.body} onChange={e => set("body")(e.target.value)}
          placeholder="Paste the email body here…"
          rows={5}
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
            Sender
          </label>
          <input
            value={form.sender} onChange={e => set("sender")(e.target.value)}
            placeholder="sender@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
            Reply-To
          </label>
          <input
            value={form.reply_to} onChange={e => set("reply_to")(e.target.value)}
            placeholder="reply@other.com"
            className={inputCls}
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <div
          onClick={() => set("has_attachment")(!form.has_attachment)}
          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
            form.has_attachment
              ? "bg-indigo-600 border-indigo-600"
              : "bg-zinc-800 border-zinc-600"
          }`}
        >
          {form.has_attachment && <Check size={9} className="text-white" />}
        </div>
        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Paperclip size={11} className="text-zinc-500" /> Has attachment
        </span>
      </label>

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
          ? <><Loader2 size={15} className="animate-spin" /> Classifying…</>
          : <><Send size={14} /> Classify Email <ChevronRight size={14} /></>}
      </button>
    </form>
  );
}

// ── Inbox email card ──────────────────────────────────────────────────────────

function InboxEmailCard({
  item, expanded, onToggle, onClassify,
}: {
  item: InboxItem;
  expanded: boolean;
  onToggle: () => void;
  onClassify: () => void;
}) {
  const isSpam   = item.result?.label === "spam";
  const hasResult = !!item.result;
  const confPct  = item.result ? (item.result.confidence * 100).toFixed(0) : null;

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      hasResult
        ? isSpam
          ? "border-rose-500/25 bg-rose-500/5"
          : "border-emerald-500/25 bg-emerald-500/5"
        : "border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/50"
    }`}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Category dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          item.category === "spam" ? "bg-rose-400/60" : "bg-emerald-400/60"
        }`} />

        {/* From + subject */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-zinc-300 truncate max-w-[160px]">
              {item.from}
            </span>
            <span className="text-[11px] text-zinc-500 truncate flex-1">
              {item.subject}
            </span>
          </div>
        </div>

        {/* Right side: result badge OR classify button */}
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {hasResult ? (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isSpam
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}>
              {isSpam ? "SPAM" : "HAM"} {confPct}%
            </span>
          ) : item.classifying ? (
            <Loader2 size={14} className="text-indigo-400 animate-spin" />
          ) : (
            <button
              onClick={onClassify}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full
                         bg-indigo-600/20 text-indigo-400 border border-indigo-500/30
                         hover:bg-indigo-600/40 transition-all"
            >
              Classify
            </button>
          )}
          {expanded ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/60 pt-3">
          <div className="space-y-1 text-[11px]">
            <div className="flex gap-2">
              <span className="text-zinc-600 w-14 shrink-0">From</span>
              <span className="text-zinc-300 font-mono">{item.from}</span>
            </div>
            {item.reply_to && (
              <div className="flex gap-2">
                <span className="text-zinc-600 w-14 shrink-0">Reply-To</span>
                <span className={`font-mono ${item.reply_to !== item.from ? "text-rose-400" : "text-zinc-300"}`}>
                  {item.reply_to}
                  {item.reply_to !== item.from && item.reply_to && (
                    <span className="ml-1.5 text-rose-500 text-[9px] font-bold">MISMATCH</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-zinc-600 w-14 shrink-0">Subject</span>
              <span className="text-zinc-200 font-semibold">{item.subject}</span>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-3 text-[11px] text-zinc-400
                          font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
            {item.body}
          </div>

          {/* Result detail */}
          {item.result && (
            <div className={`rounded-lg border p-3 space-y-2 ${
              isSpam
                ? "bg-rose-500/5 border-rose-500/20"
                : "bg-emerald-500/5 border-emerald-500/20"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold flex items-center gap-1.5 ${
                  isSpam ? "text-rose-400" : "text-emerald-400"
                }`}>
                  {isSpam ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                  {isSpam ? "SPAM DETECTED" : "CLEAN EMAIL"}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {(item.result.confidence * 100).toFixed(1)}% confidence
                  {" · "}{item.result.model_type}
                </span>
              </div>
              {/* Mini feature bar — top 3 signals */}
              <div className="space-y-1">
                {Object.entries(item.result.feature_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([name, val]) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-28 text-[9px] text-zinc-600 truncate">{name}</div>
                      <div className="flex-1 h-1 rounded-full bg-zinc-800">
                        <div className={`h-full rounded-full ${val > 0.4 ? "bg-rose-500/60" : "bg-indigo-500/40"}`}
                             style={{ width: `${val * 100}%` }} />
                      </div>
                      <div className="w-7 text-right text-[9px] text-zinc-600">{val.toFixed(2)}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!item.result && (
            <button
              onClick={onClassify}
              disabled={item.classifying}
              className="w-full py-2 rounded-lg text-xs font-semibold
                         bg-gradient-to-r from-indigo-600 to-violet-600
                         hover:from-indigo-500 hover:to-violet-500
                         text-white disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all flex items-center justify-center gap-1.5"
            >
              {item.classifying
                ? <><Loader2 size={12} className="animate-spin" /> Classifying…</>
                : <><Zap size={12} /> Classify this email</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inbox simulator ────────────────────────────────────────────────────────────

function InboxSimulator({ clientId }: { clientId: string }) {
  const [items,      setItems]      = useState<InboxItem[]>(SAMPLE_EMAILS.map(e => ({ ...e })));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allLoading, setAllLoading] = useState(false);

  const classified = items.filter(i => i.result);
  const spamFound  = classified.filter(i => i.result?.label === "spam").length;
  const hamFound   = classified.filter(i => i.result?.label === "ham").length;

  async function classifyOne(id: string) {
    const item = items.find(i => i.id === id);
    if (!item || item.classifying) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, classifying: true } : i));
    try {
      const result = await classifyEmail(clientId, {
        subject: item.subject, body: item.body,
        sender: item.sender, reply_to: item.reply_to, has_attachment: false,
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, result, classifying: false } : i));
      setExpandedId(id);
    } catch {
      setItems(prev => prev.map(i => i.id === id ? { ...i, classifying: false } : i));
      toast.error("Classification failed — is the controller running?");
    }
  }

  async function classifyAll() {
    setAllLoading(true);
    const pending = items.filter(i => !i.result && !i.classifying);
    for (const item of pending) {
      await classifyOne(item.id);
      await new Promise(r => setTimeout(r, 80));
    }
    setAllLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 text-xs text-zinc-500">
          <span>{items.length} emails</span>
          {classified.length > 0 && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-rose-400 font-semibold">{spamFound} spam</span>
              <span className="text-zinc-700">·</span>
              <span className="text-emerald-400 font-semibold">{hamFound} clean</span>
            </>
          )}
        </div>
        <button
          onClick={classifyAll}
          disabled={allLoading || classified.length === items.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     bg-indigo-600 hover:bg-indigo-500 text-white
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {allLoading
            ? <><Loader2 size={12} className="animate-spin" /> Classifying…</>
            : <><Zap size={12} /> Classify All</>}
        </button>
        {classified.length === items.length && (
          <button
            onClick={() => { setItems(SAMPLE_EMAILS.map(e => ({ ...e }))); setExpandedId(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium
                       text-zinc-500 border border-zinc-700 hover:bg-zinc-800 transition-all"
          >
            <RefreshCw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Email list */}
      <div className="space-y-2">
        {items.map(item => (
          <InboxEmailCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onClassify={() => classifyOne(item.id)}
          />
        ))}
      </div>

      {/* Accuracy note after classifying all */}
      {classified.length === items.length && (
        <div className="flex items-start gap-2 rounded-xl bg-zinc-800/40 border border-zinc-700/40 p-3">
          <Info size={13} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500">
            The model detected{" "}
            <span className="text-rose-400 font-semibold">{spamFound}/{items.filter(i => i.category === "spam").length}</span>{" "}
            spam emails and{" "}
            <span className="text-emerald-400 font-semibold">{hamFound}/{items.filter(i => i.category === "ham").length}</span>{" "}
            ham emails correctly (ground-truth labels shown by the colored dots).
          </p>
        </div>
      )}
    </div>
  );
}

// ── Dashboard component ────────────────────────────────────────────────────────

export default function Dashboard() {
  const { clientId } = useParams<{ clientId: string }>();

  const [phase,      setPhase]      = useState<Phase>("loading");
  const [status,     setStatus]     = useState<ClientStatus | null>(null);
  const [ts,         setTs]         = useState<TrainingStatus | null>(null);

  // Upload state
  const [file,       setFile]       = useState<File | null>(null);
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [rows,       setRows]       = useState<string[][]>([]);
  const [colMap,     setColMap]     = useState<ColMap>({ label:-1, body:-1, subject:-1, sender:-1, replyTo:-1 });
  const [progress,   setProgress]   = useState({ current: 0, total: 0 });
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  // Classify state
  const [classResult, setClassResult] = useState<ClassifyResponse | null>(null);
  const [activeTab,   setActiveTab]   = useState<"inbox" | "compose">("inbox");

  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load status ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!clientId) { setPhase("not-found"); return; }
    clientStatus(clientId)
      .then((s) => {
        setStatus(s);
        if (s.has_model)     setPhase("model-ready");
        else if (s.has_data) setPhase("training-watch");
        else                 setPhase("idle");
      })
      .catch(() => setPhase("not-found"));
  }, [clientId]);

  // ── Poll training status ─────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "training-watch") return;

    let cancelled = false;

    async function poll() {
      try {
        const [tStatus, cStatus] = await Promise.all([
          trainingStatus(),
          clientStatus(clientId!),
        ]);
        if (cancelled) return;
        setTs(tStatus);
        setStatus(cStatus);
        if (cStatus.has_model) setPhase("model-ready");
      } catch {
        // network error — keep polling
      }
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [phase, clientId]);

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) { toast.error("Please upload a .csv file"); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) { toast.error("Could not parse CSV"); return; }
      setHeaders(h); setRows(r);
      setColMap(detectColumns(h));
      setPhase("file-dropped");
    };
    reader.readAsText(f);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  // ── Feature extraction ───────────────────────────────────────────────────────

  async function runExtraction() {
    if (colMap.label < 0 || colMap.body < 0) {
      toast.error("Map the Label and Body columns first.");
      return;
    }
    setPhase("extracting");
    setProgress({ current: 0, total: rows.length });

    const feats: number[][] = [];
    const lbls: number[] = [];
    let skipped = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      for (const row of batch) {
        const lbl = normalizeLabel(row[colMap.label] ?? "");
        if (lbl === -1) { skipped++; continue; }
        feats.push(extractFeatures(
          colMap.subject >= 0 ? (row[colMap.subject] ?? "") : "",
          row[colMap.body] ?? "",
          colMap.sender  >= 0 ? (row[colMap.sender]  ?? "") : "",
          false,
          colMap.replyTo >= 0 ? (row[colMap.replyTo] ?? "") : "",
        ));
        lbls.push(lbl);
      }
      setProgress({ current: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
      await new Promise<void>(r => setTimeout(r, 0));
    }

    if (feats.length < 10) {
      toast.error(`Only ${feats.length} valid rows — check the label column values.`);
      setPhase("file-dropped");
      return;
    }

    setExtraction({ features: feats, labels: lbls, skipped, spamCount: lbls.filter(l=>l===1).length });
    setPhase("upload-ready");
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!extraction || !clientId) return;
    setPhase("uploading");
    const tid = toast.loading("Uploading dataset…");
    try {
      const header = [...FEATURE_NAMES, "label"].join(",");
      const lines  = extraction.features.map((row, i) =>
        [...row.map(v => v.toFixed(6)), extraction.labels[i]].join(",")
      );
      await uploadDataset(clientId, [header, ...lines].join("\n"));
      toast.success(`${extraction.features.length.toLocaleString()} rows saved!`, { id: tid });
      setStatus(s => s ? { ...s, has_data: true } : s);
      setPhase("training-watch");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? "Upload failed.";
      toast.error(msg, { id: tid });
      setPhase("upload-ready");
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const profileStyle = PROFILE_STYLES[status?.profile ?? "balanced"];

  const stepIndex = (["training-watch","model-ready","classifying","classified"] as Phase[]).includes(phase)
    ? 2 : 1;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (phase === "not-found") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <AlertCircle size={22} className="text-rose-400" />
        </div>
        <p className="text-zinc-400 text-sm">Client not found.</p>
        <a href="/" className="text-xs text-indigo-400 hover:underline">← Register a new client</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-zinc-100 leading-none">SpamFL</span>
          <p className="text-[11px] text-indigo-400 font-medium leading-none mt-0.5">Client Portal</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="w-full max-w-2xl animate-fade-up" style={{ animationDelay: "40ms" }}>
        <StepBar current={stepIndex} />
      </div>

      {/* Client badge */}
      {status && (
        <div className="w-full max-w-2xl mb-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3
                          flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono font-bold text-indigo-400">{status.client_id}</code>
              <span className="text-zinc-700 text-xs">·</span>
              <span className="text-zinc-300 text-xs font-medium">{status.name}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profileStyle.badge}`}>
              {profileStyle.label}
            </span>
            <div className="ml-auto flex items-center gap-1.5 text-[11px]">
              {status.has_model
                ? <><Shield size={11} className="text-emerald-400" /><span className="text-emerald-400">Model ready</span></>
                : status.has_data
                  ? <><TrendingUp size={11} className="text-indigo-400" /><span className="text-indigo-400">Data uploaded</span></>
                  : <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-zinc-500">Awaiting data</span></>}
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="w-full max-w-2xl animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/[0.07]
                        shadow-2xl shadow-black/50 p-7">

          {/* ── STEP 3: Train & Test ──────────────────────────────────── */}

          {phase === "training-watch" && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">
                  Step 3 — Federated Training
                </p>
                <h2 className="text-xl font-bold text-zinc-100">Train &amp; Monitor</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Your dataset is in the federation. Waiting for the training round to begin.
                </p>
              </div>
              <TrainingStatusCard ts={ts} onModelReady={() => setPhase("model-ready")} />
              {(!ts || ts.status === "idle") && (
                <div className="flex items-start gap-3 rounded-xl border border-zinc-700/40 bg-zinc-800/20 p-4">
                  <Clock size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Waiting for the admin to start training</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      Your dataset has been submitted. The federation admin will kick off the next training round from the control dashboard.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(phase === "model-ready" || phase === "classifying" || phase === "classified") && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30
                                  flex items-center justify-center shrink-0">
                    <Mail size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                      Step 3 — Test Your Model
                    </p>
                    <h2 className="text-base font-bold text-zinc-100">Email Inbox Simulator</h2>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
                {([
                  { id: "inbox",   icon: Inbox,   label: "Sample Inbox" },
                  { id: "compose", icon: PenLine,  label: "Compose" },
                ] as const).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      if (id !== "compose") { setClassResult(null); setPhase("model-ready"); }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === id
                        ? "bg-zinc-700 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "inbox" && (
                <InboxSimulator clientId={clientId!} />
              )}

              {activeTab === "compose" && (
                classResult ? (
                  <ClassifyResultCard
                    result={classResult}
                    onReset={() => { setClassResult(null); setPhase("model-ready"); }}
                  />
                ) : (
                  <EmailTester
                    clientId={clientId!}
                    onResult={(r) => { setClassResult(r); setPhase("classified"); }}
                  />
                )
              )}
            </div>
          )}

          {/* ── STEP 2: Upload ────────────────────────────────────────── */}

          {phase === "uploading" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 size={32} className="text-indigo-400 animate-spin" />
              <p className="text-sm text-zinc-400">Uploading to controller…</p>
            </div>
          )}

          {phase === "upload-ready" && extraction && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-1">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30
                                flex items-center justify-center shrink-0">
                  <Check size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Features extracted</h2>
                  <p className="text-xs text-zinc-500">Ready to upload — no raw text in the payload.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Total rows</p>
                  <p className="text-2xl font-bold text-zinc-100">{extraction.features.length.toLocaleString()}</p>
                  {extraction.skipped > 0 && (
                    <p className="text-[10px] text-zinc-600 mt-1">{extraction.skipped} skipped</p>
                  )}
                </div>
                <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Distribution</p>
                  {[
                    { label: "Spam", count: extraction.spamCount, color: "bg-rose-500" },
                    { label: "Ham",  count: extraction.features.length - extraction.spamCount, color: "bg-emerald-500" },
                  ].map(({ label, count, color }) => {
                    const pct = (count / extraction.features.length) * 100;
                    return (
                      <div key={label} className="flex items-center gap-2 mb-1.5">
                        <div className="w-10 text-[10px] text-zinc-500">{label}</div>
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-700">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-9 text-right text-[10px] text-zinc-400">{pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-zinc-800/40 border border-zinc-700/40 p-3">
                <Info size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-500">
                  Only 20 normalised numerical features per email will be transmitted.
                  Raw text stays in your browser.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setPhase("file-dropped"); setExtraction(null); }}
                  className="px-4 py-3 rounded-xl text-xs font-medium text-zinc-400
                             bg-zinc-800/60 border border-zinc-700 hover:bg-zinc-800
                             transition-all flex items-center gap-1.5"
                >
                  <X size={12} /> Start over
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm
                             bg-gradient-to-r from-indigo-600 to-violet-600
                             hover:from-indigo-500 hover:to-violet-500
                             text-white shadow-lg shadow-indigo-500/20
                             transition-all flex items-center justify-center gap-2"
                >
                  <Database size={15} /> Upload Dataset <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {phase === "extracting" && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3">
                <Cpu size={18} className="text-indigo-400 animate-pulse shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Extracting features…</h2>
                  <p className="text-xs text-zinc-500">Processing in your browser — nothing sent yet.</p>
                </div>
              </div>
              <ProgressBar value={progress.current} max={progress.total} />
              <p className="text-[11px] text-zinc-600 text-center">
                20 numerical features per row · Raw text never transmitted
              </p>
            </div>
          )}

          {phase === "file-dropped" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40">
                <FileText size={16} className="text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{file?.name}</p>
                  <p className="text-[10px] text-zinc-600">
                    {rows.length.toLocaleString()} rows · {headers.length} columns
                    {file ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
                  </p>
                </div>
                <button
                  onClick={() => { setFile(null); setHeaders([]); setRows([]); setPhase("idle"); }}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-300"
                >
                  <X size={13} />
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  Column Mapping
                </p>
                <div className="space-y-2.5">
                  <ColSelect label="Label" required value={colMap.label} headers={headers}
                    onChange={v => setColMap(m => ({ ...m, label: v }))} />
                  <ColSelect label="Body/Text" required value={colMap.body} headers={headers}
                    onChange={v => setColMap(m => ({ ...m, body: v }))} />
                  <ColSelect label="Subject" value={colMap.subject} headers={headers}
                    onChange={v => setColMap(m => ({ ...m, subject: v }))} />
                  <ColSelect label="Sender" value={colMap.sender} headers={headers}
                    onChange={v => setColMap(m => ({ ...m, sender: v }))} />
                  <ColSelect label="Reply-To" value={colMap.replyTo} headers={headers}
                    onChange={v => setColMap(m => ({ ...m, replyTo: v }))} />
                </div>
                {(colMap.label < 0 || colMap.body < 0) && (
                  <p className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-2">
                    <AlertCircle size={11} /> Label and Body columns are required.
                  </p>
                )}
              </div>

              {rows.length > 0 && colMap.label >= 0 && colMap.body >= 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                    Preview (first 3 rows)
                  </p>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-zinc-800/60">
                          <th className="px-3 py-2 text-left font-semibold text-zinc-500 w-16">Label</th>
                          <th className="px-3 py-2 text-left font-semibold text-zinc-500">Body (truncated)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 3).map((row, i) => {
                          const lbl  = row[colMap.label] ?? "?";
                          const body = (row[colMap.body] ?? "").slice(0, 70);
                          return (
                            <tr key={i} className="border-t border-zinc-800/60">
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  ["spam","1"].includes(lbl.toLowerCase())
                                    ? "bg-rose-500/15 text-rose-400"
                                    : "bg-emerald-500/15 text-emerald-400"
                                }`}>{lbl}</span>
                              </td>
                              <td className="px-3 py-2 text-zinc-500 truncate max-w-0 w-full">
                                {body}{body.length < (row[colMap.body] ?? "").length ? "…" : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={runExtraction}
                disabled={colMap.label < 0 || colMap.body < 0}
                className="w-full py-3.5 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500
                           text-white shadow-lg shadow-indigo-500/20
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all flex items-center justify-center gap-2"
              >
                <BarChart3 size={15} /> Extract Features <ChevronRight size={14} />
              </button>
            </div>
          )}

          {phase === "idle" && (
            <div className="space-y-5">
              <div>
                <StepBar current={1} />
                <h2 className="text-xl font-bold text-zinc-100">Upload Your Dataset</h2>
                <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                  Upload a Kaggle email/spam CSV. Features are extracted locally — raw text
                  never leaves your browser.
                </p>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
                  dragging
                    ? "border-indigo-500 bg-indigo-500/5"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/20 hover:bg-zinc-800/40",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef} type="file" accept=".csv"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all
                    ${dragging ? "bg-indigo-500/20 border border-indigo-500/40" : "bg-zinc-800 border border-zinc-700"}`}>
                    <Upload size={22} className={dragging ? "text-indigo-400" : "text-zinc-500"} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-300">
                      {dragging ? "Drop to upload" : "Drop your CSV here"}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">or click to browse files</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-zinc-800/40 border border-zinc-700/40 p-3">
                <Info size={13} className="text-zinc-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-zinc-500 space-y-0.5">
                  <p className="font-medium text-zinc-400">Supported Kaggle CSV formats:</p>
                  <p>• <code className="text-zinc-400">label</code> + <code className="text-zinc-400">text</code> / <code className="text-zinc-400">body</code></p>
                  <p>• <code className="text-zinc-400">v1</code> (ham/spam) + <code className="text-zinc-400">v2</code> (SMS text) — Spam Collection</p>
                  <p>• Any CSV with a spam/ham column + email body column</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-800/20 border border-zinc-800">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                  <Lock size={13} className="text-zinc-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-600">Step 3 — Train &amp; Test</p>
                  <p className="text-[10px] text-zinc-700 mt-0.5">Available after dataset upload</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <p className="mt-6 text-[11px] text-zinc-700 animate-fade-up" style={{ animationDelay: "120ms" }}>
        SpamFL · Federated Learning · Raw email data never transmitted
      </p>
    </div>
  );
}
