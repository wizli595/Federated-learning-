import { useState, useEffect, useRef, useCallback } from "react";
import { Cpu, Play, RotateCcw, Loader2, ChevronRight } from "lucide-react";
import PageShell from "../components/PageShell";
import { classifyEmail, listClients } from "../services/api";
import type { ClassifyResponse, ClientConfig } from "../services/api";

// ─── Types ─────────────────────────────────────────────────────────────────

type SpamSignal = "high" | "medium" | "low";
type SimStep    = "idle" | "fetching" | "extracting" | "layer1" | "layer2" | "output" | "done";

// ─── Static model data ─────────────────────────────────────────────────────

const MODEL_STATS = [
  { label: "Total parameters", value: "11,458",     color: "text-blue-400"    },
  { label: "Input dimension",  value: "20",          color: "text-red-400"     },
  { label: "Output classes",   value: "2",           color: "text-emerald-400" },
  { label: "Activation",       value: "ReLU",        color: "text-violet-400"  },
  { label: "Normalisation",    value: "LayerNorm",   color: "text-cyan-400"    },
  { label: "Regularisation",   value: "Dropout 30%", color: "text-pink-400"    },
];

const LAYER_DETAIL = [
  { label: "Input",   dim: "20",  dimColor: "text-red-400",     ops: ["20 email features"]                                              },
  { label: "Layer 1", dim: "128", dimColor: "text-blue-400",    ops: ["Linear (20 → 128)", "LayerNorm", "ReLU", "Dropout 0.3"]          },
  { label: "Layer 2", dim: "64",  dimColor: "text-violet-400",  ops: ["Linear (128 → 64)", "LayerNorm", "ReLU", "Dropout 0.3"]          },
  { label: "Output",  dim: "2",   dimColor: "text-emerald-400", ops: ["Linear (64 → 2)", "Softmax"]                                     },
];

const SIGNAL_BADGE: Record<SpamSignal, string> = {
  high:   "bg-red-500/15 text-red-400 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low:    "bg-zinc-700/60 text-zinc-400 border-zinc-600/40",
};

type FeatureGroup = {
  label: string;
  dotColor: string;
  features: { id: number; name: string; desc: string; spamSignal: SpamSignal }[];
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: "Body Content", dotColor: "bg-blue-400",
    features: [
      { id: 0, name: "word_count",         desc: "Total words in the body.",                                            spamSignal: "medium" },
      { id: 1, name: "char_count",         desc: "Total characters.",                                                   spamSignal: "low"    },
      { id: 2, name: "caps_ratio",         desc: "Uppercase char ratio. High caps = classic spam signal (ACT NOW).",    spamSignal: "high"   },
      { id: 3, name: "exclamation_count",  desc: "Number of ! — urgent spam stacks these.",                             spamSignal: "high"   },
      { id: 4, name: "question_count",     desc: "Number of ? — less indicative alone.",                                spamSignal: "low"    },
      { id: 5, name: "url_count",          desc: "Number of URLs — promo spam embeds many affiliate links.",            spamSignal: "high"   },
      { id: 6, name: "spam_keyword_count", desc: '"free", "win", "prize", "click", "offer" — direct lexical markers.', spamSignal: "high"   },
      { id: 7, name: "digit_ratio",        desc: "Ratio of digits — prices and codes inflate this.",                    spamSignal: "medium" },
      { id: 8, name: "special_char_ratio", desc: "Ratio of $, %, * — used to bypass keyword filters.",                 spamSignal: "medium" },
    ],
  },
  {
    label: "Subject Line", dotColor: "bg-amber-400",
    features: [
      { id: 9,  name: "subject_length",        desc: "Length of subject — extreme values are abnormal.",               spamSignal: "low"  },
      { id: 10, name: "subject_caps_ratio",    desc: "Uppercase ratio in subject — spam SHOUTS.",                      spamSignal: "high" },
      { id: 11, name: "subject_spam_keywords", desc: "Spam keywords in subject — highest-impact single feature.",      spamSignal: "high" },
    ],
  },
  {
    label: "Metadata", dotColor: "bg-red-400",
    features: [
      { id: 12, name: "has_attachment",     desc: "Binary 0/1 — malware arrives as attachments.",                      spamSignal: "medium" },
      { id: 13, name: "reply_to_mismatch",  desc: "Sender != Reply-To domain — primary phishing indicator.",           spamSignal: "high"   },
      { id: 14, name: "sender_domain_len",  desc: "Sender domain length — phishing domains are oddly sized.",          spamSignal: "medium" },
      { id: 15, name: "html_ratio",         desc: "Fraction of HTML — high ratio = mass-blast formatting.",            spamSignal: "medium" },
    ],
  },
  {
    label: "Semantic Signals", dotColor: "bg-emerald-400",
    features: [
      { id: 16, name: "urgency_word_count", desc: '"urgent", "immediately", "limited time" — artificial urgency.',     spamSignal: "high"   },
      { id: 17, name: "money_word_count",   desc: '"cash", "earn", "$", "euro" — financial bait.',                      spamSignal: "high"   },
      { id: 18, name: "personal_greeting",  desc: "1=named greeting, 0=generic — spam rarely uses real names.",        spamSignal: "medium" },
      { id: 19, name: "line_break_ratio",   desc: "Line break ratio — heavy formatting vs none.",                       spamSignal: "low"    },
    ],
  },
];

const FEATURE_SIGNAL: Record<string, SpamSignal> = Object.fromEntries(
  FEATURE_GROUPS.flatMap((g) => g.features.map((f) => [f.name, f.spamSignal]))
);

const FEATURE_MAX: Record<string, number> = {
  word_count: 300, char_count: 2000, caps_ratio: 1, exclamation_count: 10,
  question_count: 5, url_count: 10, spam_keyword_count: 8, digit_ratio: 1,
  special_char_ratio: 1, subject_length: 80, subject_caps_ratio: 1,
  subject_spam_keywords: 5, has_attachment: 1, reply_to_mismatch: 1,
  sender_domain_len: 40, html_ratio: 1, urgency_word_count: 5,
  money_word_count: 5, personal_greeting: 1, line_break_ratio: 1,
};

const FEATURE_NAMES_ORDERED = [
  "word_count","char_count","caps_ratio","exclamation_count","question_count",
  "url_count","spam_keyword_count","digit_ratio","special_char_ratio",
  "subject_length","subject_caps_ratio","subject_spam_keywords",
  "has_attachment","reply_to_mismatch","sender_domain_len","html_ratio",
  "urgency_word_count","money_word_count","personal_greeting","line_break_ratio",
];

// ─── Simulation presets ────────────────────────────────────────────────────

const PRESETS = [
  {
    id: "ham",
    label: "Legitimate Email",
    subject: "Meeting notes from Thursday",
    body: "Hi Sarah,\n\nPlease find attached the notes from our Thursday meeting. Let me know if you have any questions.\n\nBest regards,\nMark",
    sender: "mark@company.com",
    reply_to: "mark@company.com",
    has_attachment: true,
  },
  {
    id: "spam",
    label: "Marketing Spam",
    subject: "FREE OFFER!!! WIN a $500 Gift Card NOW!!!",
    body: "Congratulations! You have been selected for our exclusive FREE offer! Click here NOW to claim your prize! Limited time only! Act IMMEDIATELY before this expires!\n\nwww.freeprize.com www.winbig.com www.clickhere.net",
    sender: "promo@freeprizes123.com",
    reply_to: "claims@different-domain.net",
    has_attachment: false,
  },
  {
    id: "phishing",
    label: "Phishing Attempt",
    subject: "URGENT: Verify your account IMMEDIATELY",
    body: "Dear Customer,\n\nYour account has been flagged for suspicious activity. You must verify your personal information IMMEDIATELY or your account will be permanently suspended within 24 hours.\n\nClick here NOW: http://secure-verify-account.xyz",
    sender: "security@paypa1-verify.com",
    reply_to: "noreply@attackerdomain.ru",
    has_attachment: false,
  },
];

const STEP_LABEL: Record<SimStep, string> = {
  idle:       "Pick an email and click Analyze to start the simulation",
  fetching:   "Calling classifier API...",
  extracting: "Step 1 — Extracting 20 features from raw email fields",
  layer1:     "Step 2 — Forward pass through Hidden Layer 1  (128 neurons, LayerNorm + ReLU)",
  layer2:     "Step 3 — Forward pass through Hidden Layer 2  (64 neurons, LayerNorm + ReLU)",
  output:     "Step 4 — Computing output probabilities via Softmax",
  done:       "Classification complete",
};

// ─── Animated SVG ──────────────────────────────────────────────────────────

function getLayerState(li: number, step: SimStep): "dim" | "active" | "lit" {
  if (step === "idle" || step === "fetching") return "dim";
  const rank: Record<SimStep, number> = {
    idle: -1, fetching: -1, extracting: 0, layer1: 1, layer2: 2, output: 3, done: 5,
  };
  const cur = rank[step];
  if (li === cur) return "active";
  if (li < cur)  return "lit";
  return "dim";
}

function AnimatedNetSVG({ step, result }: { step: SimStep; result: ClassifyResponse | null }) {
  const VW = 780, VH = 390, R = 22;

  const layers = [
    { x: 90,  ys: [40,94,148,202,256,310], label: "Input Layer",   sub: "20 features",  color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.28)"   },
    { x: 290, ys: [40,94,148,202,256,310], label: "Hidden Layer 1",sub: "128 neurons",  color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.28)"  },
    { x: 490, ys: [58,118,178,238,298],    label: "Hidden Layer 2", sub: "64 neurons",  color: "#8b5cf6", bg: "rgba(139,92,246,0.07)",  border: "rgba(139,92,246,0.28)"  },
    { x: 690, ys: [135,215],               label: "Output Layer",   sub: "spam / ham",  color: "#22c55e", bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.28)"   },
  ];

  const outColors = result
    ? (result.label === "spam" ? ["#ef4444","#22c55e"] : ["#22c55e","#ef4444"])
    : ["#22c55e","#22c55e"];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto">
      <defs>
        <marker id="arr2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L5,2.5 z" fill="#52525b" fillOpacity="0.7" />
        </marker>
        {layers.map((_, li) => (
          <filter key={li} id={`glow${li}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
      </defs>

      {/* Background rects */}
      {layers.map((layer, li) => {
        const state = getLayerState(li, step);
        const minY = Math.min(...layer.ys) - R - 14;
        const maxY = Math.max(...layer.ys) + R + 14;
        return (
          <rect
            key={`bg-${li}`}
            x={layer.x - R - 18} y={minY}
            width={2 * R + 36} height={maxY - minY}
            rx={14}
            fill={state === "dim" ? "rgba(24,24,27,0.4)" : layer.bg}
            stroke={state === "dim" ? "rgba(63,63,70,0.3)" : layer.border}
            strokeWidth={state === "active" ? 2 : 1.5}
            style={{ transition: "all 0.6s ease" }}
          />
        );
      })}

      {/* Connection lines */}
      {layers.slice(0,-1).map((layer, li) => {
        const next = layers[li + 1];
        const srcState = getLayerState(li,   step);
        const dstState = getLayerState(li+1, step);
        const connLit  = srcState !== "dim" && dstState !== "dim";
        return layer.ys.flatMap((y1, i) =>
          next.ys.map((y2, j) => (
            <line
              key={`c-${li}-${i}-${j}`}
              x1={layer.x + R + 2} y1={y1}
              x2={next.x - R - 7}  y2={y2}
              stroke={connLit ? layer.color : "#3f3f46"}
              strokeOpacity={connLit ? 0.28 : 0.18}
              strokeWidth={0.9}
              markerEnd="url(#arr2)"
              style={{ transition: "all 0.5s ease" }}
            />
          ))
        );
      })}

      {/* Nodes */}
      {layers.map((layer, li) => {
        const state = getLayerState(li, step);
        return layer.ys.map((y, ni) => {
          const isOutput = li === 3;
          const nodeColor = isOutput && result
            ? outColors[ni] ?? layer.color
            : layer.color;
          return (
            <circle
              key={`n-${li}-${ni}`}
              cx={layer.x} cy={y} r={R}
              fill={state !== "dim" ? `${nodeColor}18` : "#18181b"}
              stroke={nodeColor}
              strokeWidth={state === "active" ? 2.5 : 1.8}
              strokeOpacity={state === "dim" ? 0.22 : state === "active" ? 1 : 0.8}
              filter={state === "active" ? `url(#glow${li})` : undefined}
              style={{ transition: "all 0.5s ease" }}
            />
          );
        });
      })}

      {/* Layer labels */}
      {layers.map((layer, li) => {
        const state = getLayerState(li, step);
        return (
          <g key={`lbl-${li}`}>
            <text x={layer.x} y={VH - 22} textAnchor="middle"
              fill={state === "dim" ? "#52525b" : layer.color}
              fontSize={11} fontWeight="700" fontFamily="ui-monospace, monospace"
              style={{ transition: "fill 0.5s ease" }}
            >
              {layer.label}
            </text>
            <text x={layer.x} y={VH - 6} textAnchor="middle"
              fill={state === "dim" ? "#3f3f46" : "#71717a"}
              fontSize={10} fontFamily="ui-monospace, monospace"
              style={{ transition: "fill 0.5s ease" }}
            >
              {layer.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Feature bars ──────────────────────────────────────────────────────────

function FeatureBars({ features, visible }: { features: Record<string, number>; visible: boolean }) {
  const barColor: Record<SpamSignal, string> = {
    high:   "bg-red-500",
    medium: "bg-amber-500",
    low:    "bg-zinc-500",
  };

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}
    >
      {FEATURE_NAMES_ORDERED.map((name) => {
        const raw   = features[name] ?? 0;
        const pct   = Math.min(100, Math.round((raw / (FEATURE_MAX[name] ?? 1)) * 100));
        const sig   = FEATURE_SIGNAL[name] ?? "low";
        return (
          <div key={name} className="bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2">
            <div className="flex items-center justify-between mb-1">
              <code className="text-[9px] text-zinc-400 truncate">{name}</code>
              <span className="text-[9px] font-mono text-zinc-500 ml-1 shrink-0">
                {Number.isInteger(raw) ? raw : raw.toFixed(2)}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-700/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor[sig]}`}
                style={{ width: `${pct}%`, transition: "width 0.8s ease" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Forward Pass Simulation ───────────────────────────────────────────────

function ForwardPassSim() {
  const [clients,    setClients]   = useState<ClientConfig[]>([]);
  const [clientId,   setClientId]  = useState<string>("");
  const [preset,     setPreset]    = useState(PRESETS[0]);
  const [subject,    setSubject]   = useState(PRESETS[0].subject);
  const [body,       setBody]      = useState(PRESETS[0].body);
  const [sender,     setSender]    = useState(PRESETS[0].sender);
  const [replyTo,    setReplyTo]   = useState(PRESETS[0].reply_to);
  const [hasAttach,  setHasAttach] = useState(PRESETS[0].has_attachment);
  const [step,       setStep]      = useState<SimStep>("idle");
  const [result,     setResult]    = useState<ClassifyResponse | null>(null);
  const [error,      setError]     = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listClients()
      .then((cs) => {
        setClients(cs);
        if (cs.length) setClientId(cs[0].id);
      })
      .catch(() => {});
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPreset(p);
    setSubject(p.subject);
    setBody(p.body);
    setSender(p.sender);
    setReplyTo(p.reply_to);
    setHasAttach(p.has_attachment);
  };

  const delay = (ms: number) => new Promise<void>((r) => { timerRef.current = setTimeout(r, ms); });

  const analyze = useCallback(async () => {
    if (!clientId) { setError("Select a client first"); return; }
    setError("");
    setResult(null);
    setStep("fetching");

    let res: ClassifyResponse;
    try {
      res = await classifyEmail(clientId, { subject, body, sender, reply_to: replyTo, has_attachment: hasAttach });
    } catch {
      setStep("idle");
      setError("Classification failed — is the controller running and a model trained?");
      return;
    }

    setStep("extracting"); await delay(1400);
    setStep("layer1");     await delay(1200);
    setStep("layer2");     await delay(1000);
    setStep("output");     await delay(900);
    setResult(res);
    setStep("done");
  }, [clientId, subject, body, sender, replyTo, hasAttach]);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStep("idle");
    setResult(null);
    setError("");
  };

  const running   = step !== "idle" && step !== "done";
  const showBars  = step !== "idle" && step !== "fetching";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
        <Cpu size={16} className="text-cyan-400" />
        <span className="text-sm font-semibold text-zinc-200">Forward Pass Simulation</span>
        <span className="ml-auto text-xs text-zinc-600">Watch one email pass through the model step by step</span>
      </div>

      <div className="p-6 space-y-5">
        {/* Email form + animated network */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">

          {/* Left: email form */}
          <div className="space-y-3">
            {/* Preset picker */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Email preset</p>
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    disabled={running}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition border",
                      preset.id === p.id
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200",
                      "disabled:opacity-40",
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={running}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200
                           focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={running}
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200
                           focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none disabled:opacity-50"
              />
            </div>

            {/* Sender + Reply-To */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Sender</label>
                <input
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  disabled={running}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200
                             focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Reply-To</label>
                <input
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  disabled={running}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200
                             focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Attachment toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
              <div
                onClick={() => !running && setHasAttach((v) => !v)}
                className={[
                  "w-9 h-5 rounded-full transition-colors relative",
                  hasAttach ? "bg-blue-600" : "bg-zinc-700",
                  running ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${hasAttach ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-xs text-zinc-400">Has attachment</span>
            </label>

            {/* Client selector */}
            {clients.length > 0 && (
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Client model</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={running}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200
                             focus:outline-none focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.profile})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={reset}
                disabled={step === "idle"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-zinc-800 text-zinc-400
                           border border-zinc-700 hover:text-zinc-200 disabled:opacity-30 transition"
              >
                <RotateCcw size={12} /> Reset
              </button>
              <button
                onClick={analyze}
                disabled={running || !clientId}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold
                           bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition"
              >
                {running
                  ? <><Loader2 size={12} className="animate-spin" /> Processing...</>
                  : <><Play size={12} /> Analyze</>}
              </button>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          {/* Right: animated network */}
          <div className="flex flex-col gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-4 py-2.5">
              {step === "fetching" || running
                ? <Loader2 size={13} className="text-blue-400 animate-spin shrink-0" />
                : <span className={`w-2 h-2 rounded-full shrink-0 ${step === "done" ? "bg-emerald-400" : "bg-zinc-600"}`} />}
              <span className="text-xs text-zinc-400">{STEP_LABEL[step]}</span>
            </div>

            <AnimatedNetSVG step={step} result={result} />

            {/* Output verdict */}
            {result && step === "done" && (
              <div className={[
                "flex items-center justify-between px-5 py-3 rounded-xl border text-sm font-semibold",
                result.label === "spam"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              ].join(" ")}>
                <span>{result.label === "spam" ? "SPAM detected" : "HAM — Legitimate"}</span>
                <span className="font-mono text-lg">{(result.confidence * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Feature bars — full width */}
        {showBars && result && (
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
              Extracted features &nbsp;
              <span className="text-zinc-700 normal-case">
                <span className="text-red-400">■</span> high signal &nbsp;
                <span className="text-amber-400">■</span> medium &nbsp;
                <span className="text-zinc-500">■</span> low
              </span>
            </p>
            <FeatureBars features={result.feature_breakdown} visible={showBars} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ModelPage() {
  const [openGroup, setOpenGroup] = useState<string | null>("Body Content");

  return (
    <PageShell
      title="Model Presentation"
      subtitle="TabularMLP — the neural network that classifies emails as spam or ham."
    >
      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {MODEL_STATS.map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── SIMULATION ───────────────────────────────────────────────────── */}
      <ForwardPassSim />

      {/* Layer ops + LayerNorm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-200">Layer Operations</p>
          {LAYER_DETAIL.map(({ label, dim, dimColor, ops }) => (
            <div key={label} className="flex items-start gap-4">
              <div className="w-16 shrink-0 text-center">
                <p className={`font-mono text-xl font-bold ${dimColor}`}>{dim}</p>
                <p className="text-[10px] text-zinc-600">{label}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ops.map((op) => (
                  <span key={op} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400">
                    {op}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Why LayerNorm, not BatchNorm?</p>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-400 mb-1">BatchNorm — breaks FedAvg</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Each client computes its own local batch statistics. FedAvg averaging those weights makes the model use statistics from no real batch, causing accuracy collapse.
            </p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-xs font-semibold text-emerald-400 mb-1">LayerNorm — safe to average</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Normalises per-sample across the feature dimension — no batch statistics stored. Scale and shift parameters average cleanly across clients.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-zinc-300">
            Email Feature Set
            <span className="ml-2 text-zinc-600 font-normal font-mono">input_dim = 20</span>
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Spam signal:</span>
            {(["high","medium","low"] as SpamSignal[]).map((s) => (
              <span key={s} className={`text-[10px] font-mono px-2 py-px rounded border ${SIGNAL_BADGE[s]}`}>{s}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FEATURE_GROUPS.map((group) => {
            const isOpen = openGroup === group.label;
            return (
              <div key={group.label} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  onClick={() => setOpenGroup(isOpen ? null : group.label)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                    <span className="text-sm font-medium text-zinc-200">{group.label}</span>
                    <span className="text-xs text-zinc-600 font-mono">
                      {group.features.length} features · #{group.features[0].id}–#{group.features[group.features.length-1].id}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-800/60 divide-y divide-zinc-800/60">
                    {group.features.map((f) => (
                      <div key={f.id} className="flex items-start gap-4 px-5 py-3">
                        <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0 pt-0.5 text-right">{f.id}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <code className="text-xs font-semibold text-zinc-200">{f.name}</code>
                            <span className={`text-[10px] font-mono px-1.5 py-px rounded border ${SIGNAL_BADGE[f.spamSignal]}`}>{f.spamSignal}</span>
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="text-zinc-300 font-semibold">Loss:</span> CrossEntropyLoss &nbsp;·&nbsp;
          <span className="text-zinc-300 font-semibold">Optimiser:</span> Adam &nbsp;·&nbsp;
          <span className="text-zinc-300 font-semibold">Source:</span>{" "}
          <code className="text-zinc-400">fl/shared/model.py</code> — shared by Flower server, FL clients, and controller inference.
        </p>
      </div>
    </PageShell>
  );
}
