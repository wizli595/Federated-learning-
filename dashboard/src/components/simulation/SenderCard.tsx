import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X as XIcon, Trash2 } from "lucide-react";
import type { SimEmail } from "./types";
import { PRESETS, C } from "./types";

function ComposeField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
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

interface Props {
  email: SimEmail;
  onRemove: () => void;
  onUpdate: (patch: Partial<SimEmail>) => void;
  locked: boolean;
}

export function SenderCard({ email, onRemove, onUpdate, locked }: Props) {
  const p        = PRESETS[email.preset];
  const colorKey = email.customized ? "custom" : p.color;
  const c        = C[colorKey];
  const isActive = email.status !== "idle";

  const [draft, setDraft] = useState({
    from: email.from, reply_to: email.reply_to,
    subject: email.subject, body: email.body,
    has_attachment: email.has_attachment,
  });

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

  if (email.editing) {
    return (
      <motion.div layout className="rounded-2xl border border-blue-500/30 bg-zinc-900 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pencil size={11} className="text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">Edit Email</span>
            <span className="text-[10px] text-zinc-600">base: {p.label}</span>
          </div>
          <button onClick={handleCancel} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
            <XIcon size={12} />
          </button>
        </div>
        <ComposeField label="From" value={draft.from} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
        <ComposeField label="Reply-To" value={draft.reply_to}
          onChange={(v) => setDraft((d) => ({ ...d, reply_to: v }))}
          placeholder="(optional — triggers mismatch signal if different from From)" />
        <ComposeField label="Subject" value={draft.subject}
          onChange={(v) => setDraft((d) => ({ ...d, subject: v }))} />
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
          <input type="checkbox" checked={draft.has_attachment}
            onChange={(e) => setDraft((d) => ({ ...d, has_attachment: e.target.checked }))}
            className="rounded border-zinc-700 accent-blue-500" />
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

  return (
    <motion.div
      layout
      className={`relative rounded-2xl border p-4 cursor-default select-none transition-colors duration-300 ${
        isActive ? `${c.border} bg-zinc-900` : "border-zinc-800 bg-zinc-900/50"
      }`}
      whileHover={!locked ? { scale: 1.01 } : {}}
      style={{ boxShadow: email.status === "sending" ? `0 0 24px -4px ${c.beam}66` : "none" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
          {email.customized ? "Custom" : p.label}
        </span>
        <div className="flex items-center gap-2">
          {email.has_attachment && (
            <span className="text-[9px] text-zinc-600 border border-zinc-700 px-1 rounded">📎</span>
          )}
          {email.reply_to && (
            <span className="text-[9px] text-orange-500/80 border border-orange-500/20 px-1 rounded"
              title={`Reply-to: ${email.reply_to}`}>
              ⚠ reply-to
            </span>
          )}
          {!locked && (
            <>
              <button onClick={() => onUpdate({ editing: true })}
                className="text-zinc-600 hover:text-blue-400 transition-colors" title="Edit email">
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
