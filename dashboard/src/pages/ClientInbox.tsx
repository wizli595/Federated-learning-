import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  listClients, classifyEmail,
} from "../services/api";
import type { ClientConfig, ClassifyRequest, ClassifyResponse } from "../services/api";
import { Send, Shuffle, ShieldAlert, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

// ── Random email generators ────────────────────────────────────────────────────

const MARKETING_SUBJECTS = [
  "EXCLUSIVE DEAL: 70% OFF — TODAY ONLY!!!",
  "You've been selected for our special offer",
  "Free gift inside — claim now before it expires",
  "Congratulations! You're our lucky winner",
  "Limited time: Buy 1 Get 3 FREE",
];

const PHISHING_SUBJECTS = [
  "URGENT: Your account has been compromised",
  "IMMEDIATE ACTION REQUIRED — Verify your identity",
  "Your bank account will be suspended",
  "WARNING: Unauthorized login detected",
  "Final notice: Confirm your details NOW",
];

const HAM_SUBJECTS = [
  "Meeting notes from Tuesday",
  "Re: Project update — next steps",
  "Your order has shipped",
  "Lunch tomorrow?",
  "Q1 report attached",
];

const MARKETING_BODIES = [
  `Dear Customer,\n\nCLICK HERE to claim your FREE gift!\nVisit www.deals.com/offer www.promo.com/sale\n\nBuy now and save 70%! Limited time offer!!!\nwww.shop.com/discount www.buy.com/cheap\n\nUnsubscribe | Terms`,
  `Dear Valued Member,\n\nYou've WON a prize! Claim at www.win.com/prize\nSpecial discount: www.sale.com/exclusive\nFree bonus: www.free.com/gift www.earn.com/reward\n\n© 2024 Promotions Inc.`,
];

const PHISHING_BODIES = [
  `DEAR CUSTOMER,\n\nYOUR ACCOUNT HAS BEEN COMPROMISED!!!\nYOU MUST ACT NOW OR YOUR ACCOUNT WILL BE CLOSED.\n\nCLICK HERE IMMEDIATELY: http://verify-now.tk\n\nFINAL WARNING - RESPOND NOW\n\nSecurity Team`,
  `URGENT NOTICE!!!\n\nWE DETECTED UNAUTHORIZED ACCESS TO YOUR BANK ACCOUNT.\nTRANSFER YOUR FUNDS IMMEDIATELY TO SECURE ACCOUNT.\n\nSend money to: bitcoin:1A2B3C...\nDeadline: TODAY\n\nBank Security Department`,
];

const HAM_BODIES = [
  `Hi Sarah,\n\nJust following up on the project — everything looks good on my end.\nCan we sync up Thursday afternoon?\n\nBest,\nMike`,
  `Hello James,\n\nAttached the Q1 report as requested. Let me know if you have questions.\n\nThanks,\nAnna`,
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandom(type: "marketing" | "phishing" | "ham"): ClassifyRequest {
  const senders: Record<string, string> = {
    marketing: "offers@promo-deals-99.com",
    phishing:  "security@bank-verify-now.tk",
    ham:       "colleague@company.com",
  };
  const replyTo: Record<string, string> = {
    marketing: "noreply@track-clicks.net",
    phishing:  "collect@phish-farm.ru",
    ham:       "",
  };

  return {
    subject:        type === "marketing" ? randomFrom(MARKETING_SUBJECTS)
                  : type === "phishing"  ? randomFrom(PHISHING_SUBJECTS)
                  :                        randomFrom(HAM_SUBJECTS),
    body:           type === "marketing" ? randomFrom(MARKETING_BODIES)
                  : type === "phishing"  ? randomFrom(PHISHING_BODIES)
                  :                        randomFrom(HAM_BODIES),
    sender:         senders[type],
    reply_to:       replyTo[type],
    has_attachment: type === "phishing" ? Math.random() > 0.5 : false,
  };
}

// ── Feature display helpers ────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  word_count:            "Word Count",
  char_count:            "Char Count",
  caps_ratio:            "Caps Ratio",
  exclamation_count:     "Exclamations",
  question_count:        "Questions",
  url_count:             "URL Count",
  spam_keyword_count:    "Spam Keywords",
  digit_ratio:           "Digit Ratio",
  special_char_ratio:    "Special Chars",
  subject_length:        "Subject Length",
  subject_caps_ratio:    "Subject Caps",
  subject_spam_keywords: "Subject Spam KW",
  has_attachment:        "Has Attachment",
  reply_to_mismatch:     "Reply-To Mismatch",
  sender_domain_len:     "Sender Domain Len",
  html_ratio:            "HTML Ratio",
  urgency_word_count:    "Urgency Words",
  money_word_count:      "Money Words",
  personal_greeting:     "Personal Greeting",
  line_break_ratio:      "Line Break Ratio",
};

// features with high values that are spam indicators
const SPAM_INDICATORS = new Set([
  "caps_ratio", "exclamation_count", "url_count", "spam_keyword_count",
  "subject_caps_ratio", "subject_spam_keywords", "reply_to_mismatch",
  "urgency_word_count", "money_word_count",
]);

// ── Circular confidence gauge ──────────────────────────────────────────────────

function ConfidenceGauge({ value, isSpam }: { value: number; isSpam: boolean }) {
  const R = 38;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - value);
  const color = isSpam ? "#f87171" : "#34d399";
  const glow  = isSpam
    ? "drop-shadow(0 0 6px rgba(248,113,113,0.5))"
    : "drop-shadow(0 0 6px rgba(52,211,153,0.5))";

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
        {/* Track */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="#27272a" strokeWidth="9" />
        {/* Progress arc */}
        <circle
          cx="50" cy="50" r={R}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: glow, transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      {/* Center content — counter-rotate to keep upright */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        {isSpam
          ? <ShieldAlert size={20} className="text-red-400 mb-0.5" />
          : <ShieldCheck size={20} className="text-emerald-400 mb-0.5" />
        }
        <span className={`text-xl font-bold font-mono ${isSpam ? "text-red-400" : "text-emerald-400"}`}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ClientInbox() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate     = useNavigate();

  const [client,   setClient]   = useState<ClientConfig | null>(null);
  const [form,     setForm]     = useState<ClassifyRequest>({
    subject: "", body: "", sender: "", reply_to: "", has_attachment: false,
  });
  const [result,   setResult]   = useState<ClassifyResponse | null>(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    listClients().then((cs) => setClient(cs.find((c) => c.id === clientId) ?? null));
  }, [clientId]);

  const handleClassify = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await classifyEmail(clientId!, form);
      setResult(r);
      toast[r.label === "spam" ? "error" : "success"](
        `${r.label.toUpperCase()} — ${(r.confidence * 100).toFixed(1)}% confidence`,
        { duration: 3000 }
      );
    } catch (e: any) {
      const d = e.response?.data?.detail;
      toast.error(Array.isArray(d) ? d.map((x: any) => x.msg ?? JSON.stringify(x)).join("; ") : (d ?? "Classification failed — is the model trained?"));
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = (type: "marketing" | "phishing" | "ham") => {
    setForm(generateRandom(type));
    setResult(null);
  };

  const isSpam = result?.label === "spam";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/clients")}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            {client ? `${client.name}'s Inbox` : "Inbox Simulation"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Simulate receiving an email and classify it with the trained global model.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: compose */}
        <div className="space-y-4">
          {/* Quick generate buttons */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Generate a random email:</p>
            <div className="flex gap-2">
              {(["marketing", "phishing", "ham"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleRandom(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition capitalize
                    ${t === "marketing" ? "bg-amber-400/10  text-amber-400  border-amber-400/20  hover:bg-amber-400/20"
                    : t === "phishing"  ? "bg-red-400/10    text-red-400    border-red-400/20    hover:bg-red-400/20"
                    :                    "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
                    }`}
                >
                  <Shuffle size={11} /> {t}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            {[
              { key: "sender",   label: "From",       placeholder: "sender@example.com" },
              { key: "reply_to", label: "Reply-To",   placeholder: "(optional)" },
              { key: "subject",  label: "Subject",    placeholder: "Email subject" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-zinc-500">{label}</label>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100
                             text-sm focus:outline-none focus:border-blue-500 placeholder:text-zinc-700"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Body</label>
              <textarea
                rows={7}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500 placeholder:text-zinc-700 resize-none"
                placeholder="Email body text..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_attachment}
                onChange={(e) => setForm({ ...form, has_attachment: e.target.checked })}
                className="rounded border-zinc-700"
              />
              <span className="text-xs text-zinc-400">Has attachment</span>
            </label>
          </div>

          <button
            onClick={handleClassify}
            disabled={loading || (!form.subject && !form.body)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                       bg-blue-600 hover:bg-blue-500 text-white text-sm transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Classify Email
          </button>
        </div>

        {/* Right: result */}
        <div className="space-y-4">
          {result ? (
            <div className="animate-scale-in space-y-4">
              {/* Verdict card */}
              <div className={`rounded-xl border overflow-hidden
                ${isSpam
                  ? "bg-red-950/30 border-red-500/30"
                  : "bg-emerald-950/30 border-emerald-500/30"
                }`}
              >
                {/* Top strip */}
                <div className={`h-1 w-full ${isSpam ? "bg-red-500" : "bg-emerald-500"}`} />

                <div className="p-5 flex flex-col items-center gap-3">
                  {/* Circular gauge */}
                  <ConfidenceGauge value={result.confidence} isSpam={isSpam} />

                  {/* Verdict label */}
                  <div className="text-center">
                    <p className={`text-3xl font-bold uppercase tracking-widest font-mono
                      ${isSpam ? "text-red-400" : "text-emerald-400"}`}
                    >
                      {result.label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {(result.confidence * 100).toFixed(1)}% confidence
                    </p>
                  </div>

                  {/* Spam score gradient bar */}
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-600">
                      <span>Ham</span>
                      <span className="text-zinc-400 font-mono">
                        score: {result.spam_score.toFixed(3)}
                      </span>
                      <span>Spam</span>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden"
                         style={{ background: "linear-gradient(to right, #34d399, #fbbf24, #f87171)" }}>
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] transition-all duration-700"
                        style={{ left: `calc(${result.spam_score * 100}% - 1px)` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature breakdown */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                  <p className="text-xs text-zinc-400 font-medium">Feature Breakdown</p>
                  <p className="text-xs text-zinc-600">
                    Values extracted from the email — model decision is based on these only
                  </p>
                </div>
                <div className="divide-y divide-zinc-800/50 max-h-64 overflow-y-auto">
                  {Object.entries(result.feature_breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, val]) => {
                      const isIndicator = SPAM_INDICATORS.has(key) && val > 0.1;
                      return (
                        <div key={key} className="flex items-center justify-between px-4 py-1.5">
                          <span className={`text-xs ${isIndicator ? "text-amber-400" : "text-zinc-500"}`}>
                            {FEATURE_LABELS[key] ?? key}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-zinc-800 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  isIndicator ? "bg-amber-400" : "bg-zinc-600"
                                }`}
                                style={{ width: `${Math.min(val * 100, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-mono w-10 text-right ${isIndicator ? "text-amber-400" : "text-zinc-600"}`}>
                              {val.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-64
                            border border-dashed border-zinc-800 rounded-xl text-zinc-600 space-y-2">
              <ShieldCheck size={28} className="text-zinc-700" />
              <p className="text-sm">Result will appear here</p>
              <p className="text-xs text-zinc-700">Compose or generate an email, then classify</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
