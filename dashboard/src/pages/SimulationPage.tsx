import { useEffect, useRef, useState } from "react";
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, animate,
} from "framer-motion";
import {
  Shield, ShieldAlert, Plus, Play, RotateCcw,
  Trash2, Loader2, Cpu, Mail, Inbox, Lock,
  Pencil, Check, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  listClients, classifyEmail,
  trainingStatus as fetchTrainingStatus,
} from "../services/api";
import type { ClassifyResponse, ClientConfig, TrainingStatus } from "../services/api";
import PageShell from "../components/PageShell";

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = {
  ham: {
    label: "Legitimate", color: "emerald" as const,
    from: "colleague@company.com", reply_to: "", has_attachment: false,
    subject: "Team sync tomorrow at 10am",
    body: "Hi everyone, just a quick reminder about our weekly sync tomorrow at 10am. Please bring your updates. Thanks, Sarah",
  },
  marketing: {
    label: "Marketing Spam", color: "amber" as const,
    from: "deals@shopnow-promo.biz", reply_to: "", has_attachment: false,
    subject: "EXCLUSIVE: 70% OFF — Today only!",
    body: "Congratulations! You have been selected for our exclusive limited offer! FREE shipping + 70% off everything. Click now to claim your bonus reward! Expires tonight! http://click-deal.biz http://claim-reward.biz http://shop-now.biz",
  },
  phishing: {
    label: "Phishing", color: "red" as const,
    from: "security@bankofamerica-alert.net",
    reply_to: "collect@harvest-form.ru", has_attachment: true,
    subject: "URGENT: Your account has been compromised",
    body: "Dear Valued Customer, We have detected SUSPICIOUS activity on your account. It will be IMMEDIATELY suspended unless you verify NOW. Click: http://verify-account-now.net http://secure-login.phish.ru — Urgent action required! Limited time!",
  },
  bec: {
    label: "CEO Fraud", color: "orange" as const,
    from: "d.johnson@company-board.net",
    reply_to: "replies@external-mail.io", has_attachment: false,
    subject: "Urgent wire transfer needed",
    body: "Hi, I am in a board meeting and cannot take calls. Please process a wire transfer of $47,500 to our new vendor immediately. Account: 8821-0047-3312, Routing: 021000021. Time sensitive. Confirm when done. - David",
  },
  invoice: {
    label: "Fake Invoice", color: "violet" as const,
    from: "billing@paypal-invoice.net",
    reply_to: "payment@collect-invoices.biz", has_attachment: true,
    subject: "Invoice #INV-2026-0892 — Payment due",
    body: "Dear customer, your invoice of $249.00 is now due. Please transfer payment to account 4421-8812 by end of day to avoid service suspension. Wire reference: INV-2026-0892. Financial department.",
  },
} as const;

type PresetKey    = keyof typeof PRESETS;
type PacketStatus = "idle" | "sending" | "at-server" | "delivering" | "done" | "error";
const PRESET_CYCLE: PresetKey[] = ["ham", "marketing", "phishing", "bec", "invoice"];

const C = {
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400", beam: "#10b981" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/40",   text: "text-amber-400",   dot: "bg-amber-400",   beam: "#f59e0b" },
  red:     { bg: "bg-red-500/10",     border: "border-red-500/40",     text: "text-red-400",     dot: "bg-red-400",     beam: "#ef4444" },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/40",  text: "text-orange-400",  dot: "bg-orange-400",  beam: "#f97316" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/40",  text: "text-violet-400",  dot: "bg-violet-400",  beam: "#8b5cf6" },
  custom:  { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-400",    dot: "bg-blue-400",    beam: "#60a5fa" },
} as const;

interface SimEmail {
  id: string; preset: PresetKey;
  from: string; reply_to: string; has_attachment: boolean;
  subject: string; body: string;
  status: PacketStatus; result?: ClassifyResponse;
  editing: boolean;
  customized: boolean;
}

const STATUS_ORDER: PacketStatus[] = ["idle","sending","at-server","delivering","done","error"];
const gte = (s: PacketStatus, t: PacketStatus) =>
  STATUS_ORDER.indexOf(s) >= STATUS_ORDER.indexOf(t);

const uid = () => Math.random().toString(36).slice(2, 8);
const makeEmail = (p: PresetKey): SimEmail =>
  ({ id: uid(), preset: p, ...PRESETS[p], status: "idle", editing: false, customized: false });

// ── Bus connector (vertical bus + horizontal branch per row) ──────────────────
//
// Replaces the old per-row horizontal beam.  All sender branches share a
// vertical "bus" that runs along the server-side edge of the connector column,
// so every row visually connects to the server regardless of the server card's
// rendered height.

function BusConnector({
  email, index, total, side,
}: {
  email: SimEmail;
  index: number;
  total: number;
  side: "left" | "right";
}) {
  const isFirst = index === 0;
  const isLast  = index === total - 1;

  // active / done logic mirrors the old AnimatedBeam calls per side
  const active = side === "left" ? email.status === "sending"     : email.status === "delivering";
  const done   = side === "left" ? gte(email.status, "at-server") : email.status === "done";

  const colorKey  = email.customized ? "custom" : PRESETS[email.preset].color;
  const beamColor = side === "left"
    ? C[colorKey].beam
    : (email.result?.label === "spam" ? C.red.beam : C.emerald.beam);

  // Bus runs along the server-facing edge of the column
  const busEdge = side === "left" ? "right" : "left";

  const progress  = useMotionValue(0);
  const fillWidth = useTransform(progress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    if (active || done) {
      animate(progress, 1, { duration: 0.75, ease: "easeInOut" });
    } else {
      progress.set(0);
    }
  }, [active, done]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // absolute inset-0 fills the full grid cell including its paddingBottom,
    // so the bus segments bridge the gap to the adjacent row automatically.
    <div className="absolute inset-0">

      {/* ── Vertical bus — top segment (up to row above) ──────────────── */}
      {!isFirst && (
        <div
          className="absolute w-px bg-zinc-800"
          style={{ [busEdge]: 0, top: 0, height: "calc(50% - 4px)" }}
        />
      )}
      {/* ── Vertical bus — bottom segment (down to row below) ─────────── */}
      {!isLast && (
        <div
          className="absolute w-px bg-zinc-800"
          style={{ [busEdge]: 0, top: "calc(50% + 4px)", bottom: 0 }}
        />
      )}

      {/* ── Horizontal branch track (full width, sender ↔ bus) ────────── */}
      <div
        className="absolute inset-x-0 bg-zinc-800"
        style={{ top: "50%", height: 1 }}
      />

      {/* ── Animated fill — grows left → right ────────────────────────── */}
      <motion.div
        className="absolute left-0 h-px origin-left"
        style={{
          top: "50%",
          width: fillWidth,
          background: `linear-gradient(to right, transparent, ${beamColor})`,
          boxShadow: active ? `0 0 8px 1px ${beamColor}88` : "none",
        }}
      />

      {/* ── Travelling dot ────────────────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="dot"
            className="absolute w-2.5 h-2.5 rounded-full z-10"
            style={{
              top: "calc(50% - 5px)",
              backgroundColor: beamColor,
              boxShadow: `0 0 12px 4px ${beamColor}99`,
            }}
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "calc(100% - 10px)", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* ── Junction dot — sits on the bus line ───────────────────────── */}
      <motion.div
        className="absolute w-2 h-2 rounded-full z-20"
        style={{ top: "calc(50% - 4px)", [busEdge]: -4 }}
        animate={{
          scale: active ? [1, 1.5, 1] : 1,
          backgroundColor: done || active ? beamColor : "#3f3f46",
        }}
        transition={{ duration: active ? 0.8 : 0.3, repeat: active ? Infinity : 0 }}
      />
    </div>
  );
}

// ── Compose field helper ──────────────────────────────────────────────────────

function ComposeField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700
                   text-zinc-100 text-xs focus:outline-none focus:border-blue-500
                   placeholder:text-zinc-700"
      />
    </div>
  );
}

// ── Sender card (summary + inline composer) ───────────────────────────────────

function SenderCard({ email, onRemove, onUpdate, locked }: {
  email: SimEmail;
  onRemove: () => void;
  onUpdate: (patch: Partial<SimEmail>) => void;
  locked: boolean;
}) {
  const p        = PRESETS[email.preset];
  const colorKey = email.customized ? "custom" : p.color;
  const c        = C[colorKey];
  const isActive = email.status !== "idle";

  // Local draft — initialised from email, synced back when editor closes
  const [draft, setDraft] = useState({
    from: email.from, reply_to: email.reply_to,
    subject: email.subject, body: email.body,
    has_attachment: email.has_attachment,
  });

  // Re-sync draft whenever the editor is closed externally (reset, cancel)
  useEffect(() => {
    if (!email.editing) {
      setDraft({
        from: email.from, reply_to: email.reply_to,
        subject: email.subject, body: email.body,
        has_attachment: email.has_attachment,
      });
    }
  }, [email.editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const isCustomized =
      draft.from           !== p.from          ||
      draft.reply_to       !== p.reply_to      ||
      draft.subject        !== p.subject       ||
      draft.body           !== p.body          ||
      draft.has_attachment !== p.has_attachment;
    onUpdate({ ...draft, editing: false, customized: isCustomized });
  };

  const handleCancel = () => {
    setDraft({
      from: email.from, reply_to: email.reply_to,
      subject: email.subject, body: email.body,
      has_attachment: email.has_attachment,
    });
    onUpdate({ editing: false });
  };

  // ── Compose / edit mode ──────────────────────────────────────────────────

  if (email.editing) {
    return (
      <motion.div
        layout
        className="rounded-2xl border border-blue-500/30 bg-zinc-900 p-4 space-y-2.5"
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pencil size={11} className="text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">Edit Email</span>
            <span className="text-[10px] text-zinc-600">base: {p.label}</span>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
            title="Cancel"
          >
            <XIcon size={12} />
          </button>
        </div>

        <ComposeField
          label="From"
          value={draft.from}
          onChange={(v) => setDraft((d) => ({ ...d, from: v }))}
        />
        <ComposeField
          label="Reply-To"
          value={draft.reply_to}
          onChange={(v) => setDraft((d) => ({ ...d, reply_to: v }))}
          placeholder="(optional — triggers mismatch signal if different from From)"
        />
        <ComposeField
          label="Subject"
          value={draft.subject}
          onChange={(v) => setDraft((d) => ({ ...d, subject: v }))}
        />

        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">Body</label>
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            rows={4}
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700
                       text-zinc-100 text-xs focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={draft.has_attachment}
            onChange={(e) => setDraft((d) => ({ ...d, has_attachment: e.target.checked }))}
            className="rounded border-zinc-700 accent-blue-500"
          />
          <span className="text-[11px] text-zinc-400">Has attachment</span>
        </label>

        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                     bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
        >
          <Check size={12} /> Apply
        </button>
      </motion.div>
    );
  }

  // ── Summary / display mode ───────────────────────────────────────────────

  return (
    <motion.div
      layout
      className={`relative rounded-2xl border p-4 cursor-default select-none transition-colors duration-300 ${
        isActive ? `${c.border} bg-zinc-900` : "border-zinc-800 bg-zinc-900/50"
      }`}
      whileHover={!locked ? { scale: 1.01 } : {}}
      style={{
        boxShadow: email.status === "sending"
          ? `0 0 24px -4px ${c.beam}66`
          : "none",
      }}
    >
      {/* Badge row */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
          {email.customized ? "Custom" : p.label}
        </span>
        <div className="flex items-center gap-2">
          {email.has_attachment && (
            <span className="text-[9px] text-zinc-600 border border-zinc-700 px-1 rounded">📎</span>
          )}
          {email.reply_to && (
            <span
              className="text-[9px] text-orange-500/80 border border-orange-500/20 px-1 rounded"
              title={`Reply-to: ${email.reply_to}`}
            >
              ⚠ reply-to
            </span>
          )}
          {!locked && (
            <>
              <button
                onClick={() => onUpdate({ editing: true })}
                className="text-zinc-600 hover:text-blue-400 transition-colors"
                title="Edit email"
              >
                <Pencil size={11} />
              </button>
              <button onClick={onRemove} className="text-zinc-700 hover:text-red-400 transition-colors">
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-zinc-600 truncate mb-0.5">{email.from}</p>
      <p className="text-sm font-semibold text-zinc-200 truncate leading-snug">{email.subject}</p>

      {/* Status pill */}
      <div className="mt-2.5 h-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={email.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`text-[10px] font-mono ${
              email.status === "idle"       ? "text-zinc-700" :
              email.status === "sending"    ? "text-blue-400" :
              email.status === "at-server"  ? "text-violet-400" :
              email.status === "delivering" ? "text-blue-400" :
              email.status === "done"       ? (email.result?.label === "spam" ? "text-red-400" : "text-emerald-400") :
              "text-red-500"
            }`}
          >
            {email.status === "idle"       ? "waiting…" :
             email.status === "sending"    ? "⇒ sending" :
             email.status === "at-server"  ? "⚙ classifying…" :
             email.status === "delivering" ? "⇒ delivering" :
             email.status === "done"       ? (email.result?.label === "spam" ? "▲ spam detected" : "✓ delivered clean") :
             "✕ error"}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Server card ───────────────────────────────────────────────────────────────

function ServerCard({ emails, active }: { emails: SimEmail[]; active: boolean }) {
  return (
    <motion.div
      className={`rounded-2xl border flex flex-col transition-colors duration-300 ${
        active ? "border-blue-500/50 bg-zinc-900" : "border-zinc-800 bg-zinc-900/60"
      }`}
      animate={active ? { boxShadow: ["0 0 0px #3b82f600", "0 0 32px #3b82f644", "0 0 0px #3b82f600"] } : { boxShadow: "none" }}
      transition={active ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <div className="flex flex-col items-center gap-4 p-5">
        {/* Icon */}
        <div className="relative">
          <motion.div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              active ? "bg-blue-500/20" : "bg-zinc-800/60"
            }`}
            animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={active ? { duration: 1.5, repeat: Infinity } : {}}
          >
            <Cpu size={26} className={active ? "text-blue-400" : "text-zinc-500"} />
          </motion.div>
          {active && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-blue-400/30"
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-200">FL Classifier</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">TabularMLP · 20 features</p>
        </div>

        {/* Processing log — fixed height, scrolls when > 4 emails */}
        <div className="w-full space-y-2.5 max-h-24 overflow-y-auto">
          {emails.map((e) => {
            const isDone = gte(e.status, "delivering");
            return (
              <motion.div
                key={e.id}
                animate={{ opacity: e.status === "at-server" ? 1 : isDone ? 0.45 : 0.18 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 text-[11px]"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    e.status === "at-server"              ? "bg-blue-400" :
                    isDone && e.result?.label === "spam"  ? "bg-red-400" :
                    isDone                                ? "bg-emerald-400" :
                    "bg-zinc-700"
                  }`}
                  animate={e.status === "at-server" ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                  transition={{ duration: 0.8, repeat: e.status === "at-server" ? Infinity : 0 }}
                />
                <span className="text-zinc-500 truncate min-w-0 flex-1">{e.from}</span>
                <AnimatePresence mode="wait">
                  {isDone && e.result && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`font-bold shrink-0 text-[10px] ${
                        e.result.label === "spam" ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {e.result.label.toUpperCase()}
                    </motion.span>
                  )}
                  {e.status === "at-server" && (
                    <motion.span
                      key="processing"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="text-blue-400 text-[10px] shrink-0"
                    >
                      …
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Lock icon */}
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-700 mt-auto">
          <Lock size={9} /> DP noise applied
        </div>
      </div>
    </motion.div>
  );
}

// ── Inbox result card ─────────────────────────────────────────────────────────

function ResultCard({ email }: { email: SimEmail }) {
  const r      = email.result!;
  const isSpam = r.label === "spam";
  const top    = Object.entries(r.feature_breakdown)
    .filter(([, v]) => v > 0.02)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`rounded-2xl border p-4 h-full ${
        isSpam ? "border-red-500/40 bg-red-950/20" : "border-emerald-500/30 bg-emerald-950/10"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSpam
            ? <ShieldAlert size={15} className="text-red-400" />
            : <Shield size={15} className="text-emerald-400" />}
          <span className={`text-sm font-bold tracking-wider ${isSpam ? "text-red-400" : "text-emerald-400"}`}>
            {r.label.toUpperCase()}
          </span>
        </div>
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
          className={`text-sm font-bold px-2 py-0.5 rounded-full ${
            isSpam ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
          }`}
        >
          {(r.confidence * 100).toFixed(0)}%
        </motion.span>
      </div>

      <p className="text-xs text-zinc-400 truncate mb-3">{email.subject}</p>

      <div className="space-y-1.5">
        {top.map(([k, v], i) => (
          <div key={k} className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-600 truncate shrink-0" style={{ width: 96 }}>
              {k.replace(/_/g, " ")}
            </span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isSpam ? "bg-red-500" : "bg-emerald-500"}`}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(v * 100, 100)}%` }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-[9px] text-zinc-600 w-5 text-right">{(v * 100).toFixed(0)}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-zinc-700 font-mono mt-2.5">P(spam) = {r.spam_score.toFixed(3)}</p>
    </motion.div>
  );
}

// ── Empty inbox slot ──────────────────────────────────────────────────────────

function EmptySlot() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800/60 h-full flex items-center justify-center min-h-[112px]">
      <span className="text-[10px] text-zinc-800 select-none">—</span>
    </div>
  );
}

// ── Model selector bar ────────────────────────────────────────────────────────

function ModelBar({
  clients, clientId, onClientChange,
  trainStatus, statusLoading, locked,
}: {
  clients: ClientConfig[];
  clientId: string | null;
  onClientChange: (id: string) => void;
  trainStatus: TrainingStatus | null;
  statusLoading: boolean;
  locked: boolean;
}) {
  const navigate    = useNavigate();
  const modelReady  = trainStatus?.model_distributed === true;
  const modelPending = trainStatus?.status === "training" || trainStatus?.status === "waiting";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex-wrap">
      <div className="flex items-center gap-2 shrink-0">
        <Cpu size={13} className="text-zinc-500" />
        <span className="text-xs text-zinc-500">Classify with:</span>
      </div>

      {statusLoading ? (
        <span className="text-xs text-zinc-600 flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Loading…
        </span>
      ) : clients.length === 0 ? (
        <span className="text-xs text-amber-400">No clients — add one first</span>
      ) : (
        <select
          value={clientId ?? ""}
          onChange={(e) => onClientChange(e.target.value)}
          disabled={locked}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700
                     text-zinc-200 text-xs focus:outline-none focus:border-blue-500
                     disabled:opacity-50 cursor-pointer"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Model status */}
      <div className="ml-auto flex items-center gap-2">
        {statusLoading ? null : modelReady ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Model ready
          </span>
        ) : modelPending ? (
          <span className="flex items-center gap-1.5 text-xs text-blue-400">
            <Loader2 size={11} className="animate-spin" /> Training in progress…
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              No trained model
            </span>
            <button
              onClick={() => navigate("/training")}
              className="text-xs text-blue-400 hover:text-blue-300 transition underline underline-offset-2"
            >
              Train now →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const [emails,        setEmails]       = useState<SimEmail[]>([
    makeEmail("ham"), makeEmail("marketing"), makeEmail("phishing"),
  ]);
  const [running,       setRunning]      = useState(false);
  const [clients,       setClients]      = useState<ClientConfig[]>([]);
  const [clientId,      setClientId]     = useState<string | null>(null);
  const [trainStatus,   setTrainStatus]  = useState<TrainingStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [srvActive,     setSrvActive]    = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    Promise.all([listClients(), fetchTrainingStatus()])
      .then(([cs, ts]) => {
        setClients(cs);
        if (cs.length) setClientId(cs[0].id);
        setTrainStatus(ts);
      })
      .catch(() => {})
      .finally(() => setStatusLoading(false));
  }, []);

  const upd = (id: string, patch: Partial<SimEmail>) =>
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const sleep = (ms: number) =>
    new Promise<void>((res) => setTimeout(res, ms));

  const simulate = async () => {
    if (!clientId) { toast.error("Select a client first"); return; }
    if (trainStatus?.model_distributed === false) {
      toast.error("No trained model — complete a training run first");
      return;
    }
    // Close any open editors before running
    abortRef.current = false;
    setRunning(true);
    setEmails((prev) => prev.map((e) => ({ ...e, status: "idle", result: undefined, editing: false })));
    await sleep(300);

    for (const email of emails) {
      if (abortRef.current) break;

      upd(email.id, { status: "sending" });
      setSrvActive(true);
      await sleep(950);

      if (abortRef.current) break;
      upd(email.id, { status: "at-server" });

      let result: ClassifyResponse | undefined;
      try {
        result = await classifyEmail(clientId, {
          subject:        email.subject,
          body:           email.body,
          sender:         email.from,
          reply_to:       email.reply_to,
          has_attachment: email.has_attachment,
        });
      } catch {
        upd(email.id, { status: "error" });
        setSrvActive(false);
        await sleep(300);
        continue;
      }

      await sleep(700);
      upd(email.id, { status: "delivering", result });
      setSrvActive(false);
      await sleep(950);
      upd(email.id, { status: "done" });
      await sleep(200);
    }

    setRunning(false);
    setSrvActive(false);
    if (!abortRef.current) toast.success("Simulation complete");
  };

  const reset = () => {
    abortRef.current = true;
    setRunning(false);
    setSrvActive(false);
    // Preserve customizations — only clear simulation state and close editors
    setEmails((prev) => prev.map((e) => ({ ...e, status: "idle", result: undefined, editing: false })));
  };

  const addEmail = () => {
    const used = new Set(emails.map((e) => e.preset));
    const next = PRESET_CYCLE.find((p) => !used.has(p)) ?? PRESET_CYCLE[emails.length % PRESET_CYCLE.length];
    setEmails((prev) => [...prev, makeEmail(next)]);
  };

  const anyEditing = emails.some((e) => e.editing);
  const allDone    = emails.length > 0 && emails.every((e) => e.status === "done" || e.status === "error");
  const spamCount  = emails.filter((e) => e.result?.label === "spam").length;
  const hamCount   = emails.filter((e) => e.result?.label === "ham").length;

  const simActions = (
    <>
      <button
        onClick={reset}
        disabled={!running && emails.every((e) => e.status === "idle")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-zinc-800 text-zinc-400
                   border border-zinc-700 hover:text-zinc-200 disabled:opacity-30 transition-all"
      >
        <RotateCcw size={12} /> Reset
      </button>
      <button
        onClick={running ? reset : simulate}
        disabled={emails.length === 0 || anyEditing}
        title={anyEditing ? "Close open editors before running" : undefined}
        className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 ${
          running
            ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            : "bg-blue-600 text-white hover:bg-blue-500"
        }`}
      >
        {running
          ? <><Loader2 size={13} className="animate-spin" /> Stop</>
          : <><Play size={13} /> Simulate</>}
      </button>
    </>
  );

  return (
    <PageShell
      title="Email Flow Simulator"
      subtitle="Trace each email from sender → FL classifier → inbox in real time."
      actions={simActions}
      size="lg"
    >
      {/* ── Model / client selector ─────────────────────────────────────────── */}
      <ModelBar
        clients={clients}
        clientId={clientId}
        onClientChange={setClientId}
        trainStatus={trainStatus}
        statusLoading={statusLoading}
        locked={running}
      />

      {/* ── Column labels ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_80px_220px_80px_1fr] text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        <div className="flex items-center gap-1.5 px-1"><Mail size={10} /> Senders</div>
        <div />
        <div className="flex items-center justify-center gap-1.5"><Cpu size={10} /> AI Server</div>
        <div />
        <div className="flex items-center justify-end gap-1.5 px-1"><Inbox size={10} /> Inbox</div>
      </div>

      {/* ── Pipeline ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_80px_220px_80px_1fr]" style={{ alignItems: "stretch" }}>

        {/* Server card — spans all rows */}
        <div
          className="px-2"
          style={{ gridColumn: 3, gridRow: `1 / ${emails.length + 1}`, paddingBottom: "12px", alignSelf: "center" }}
        >
          <ServerCard emails={emails} active={srvActive} />
        </div>

        {/* Per-email rows */}
        {emails.map((email, i) => {
          return [
            /* Sender */
            <div
              key={`s${email.id}`}
              style={{ gridColumn: 1, gridRow: i + 1, paddingRight: 8, paddingBottom: 12 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 24 }}
              >
                <SenderCard
                  email={email}
                  onRemove={() => setEmails((p) => p.filter((e) => e.id !== email.id))}
                  onUpdate={(patch) => upd(email.id, patch)}
                  locked={running}
                />
              </motion.div>
            </div>,

            /* Left bus connector */
            <div
              key={`lb${email.id}`}
              className="relative"
              style={{ gridColumn: 2, gridRow: i + 1, paddingBottom: 12 }}
            >
              <BusConnector email={email} index={i} total={emails.length} side="left" />
            </div>,

            /* Right bus connector */
            <div
              key={`rb${email.id}`}
              className="relative"
              style={{ gridColumn: 4, gridRow: i + 1, paddingBottom: 12 }}
            >
              <BusConnector email={email} index={i} total={emails.length} side="right" />
            </div>,

            /* Inbox */
            <div
              key={`i${email.id}`}
              style={{ gridColumn: 5, gridRow: i + 1, paddingLeft: 8, paddingBottom: 12 }}
            >
              <AnimatePresence mode="wait">
                {email.status === "done" && email.result ? (
                  <ResultCard key="result" email={email} />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <EmptySlot />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>,
          ];
        })}
      </div>

      {/* ── Add email ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!running && emails.length < 6 && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            onClick={addEmail}
            className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl text-sm text-zinc-600
                       border border-dashed border-zinc-800 hover:text-zinc-300 hover:border-zinc-600 transition-all"
          >
            <Plus size={14} /> Add email
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {allDone && (hamCount + spamCount) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
            className="flex items-center gap-6 px-5 py-3 rounded-2xl border border-zinc-800 bg-zinc-900/60"
          >
            <span className="text-xs text-zinc-500 shrink-0">Results:</span>
            <span className="text-sm font-bold text-emerald-400">{hamCount} clean</span>
            <span className="text-sm font-bold text-red-400">{spamCount} threat{spamCount !== 1 ? "s" : ""}</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${(spamCount / emails.length) * 100}%` }}
                transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-semibold text-zinc-400 shrink-0">
              {Math.round((spamCount / emails.length) * 100)}% threat rate
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
