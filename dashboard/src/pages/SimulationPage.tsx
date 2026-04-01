import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, RotateCcw, Loader2, Mail, Cpu, Inbox } from "lucide-react";
import { toast } from "sonner";
import {
  listClients, classifyEmail,
  trainingStatus as fetchTrainingStatus,
} from "../services/api";
import type { ClassifyResponse, ClientConfig, TrainingStatus } from "../services/api";
import PageShell from "../components/PageShell";
import { BusConnector } from "../components/simulation/BusConnector";
import { SenderCard } from "../components/simulation/SenderCard";
import { ServerCard } from "../components/simulation/ServerCard";
import { ResultCard, EmptySlot } from "../components/simulation/ResultCard";
import { ModelBar } from "../components/simulation/ModelBar";
import { type SimEmail, PRESET_CYCLE, makeEmail } from "../components/simulation/types";

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

  const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

  const simulate = async () => {
    if (!clientId) { toast.error("Select a client first"); return; }
    if (trainStatus?.model_distributed === false) {
      toast.error("No trained model — complete a training run first");
      return;
    }
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
      <ModelBar
        clients={clients}
        clientId={clientId}
        onClientChange={setClientId}
        trainStatus={trainStatus}
        statusLoading={statusLoading}
        locked={running}
      />

      {/* Column labels */}
      <div className="grid grid-cols-[1fr_80px_220px_80px_1fr] text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        <div className="flex items-center gap-1.5 px-1"><Mail size={10} /> Senders</div>
        <div />
        <div className="flex items-center justify-center gap-1.5"><Cpu size={10} /> AI Server</div>
        <div />
        <div className="flex items-center justify-end gap-1.5 px-1"><Inbox size={10} /> Inbox</div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-[1fr_80px_220px_80px_1fr]" style={{ alignItems: "stretch" }}>
        {/* Server card — spans all rows */}
        <div
          className="px-2"
          style={{ gridColumn: 3, gridRow: `1 / ${emails.length + 1}`, paddingBottom: "12px", alignSelf: "center" }}
        >
          <ServerCard emails={emails} active={srvActive} />
        </div>

        {emails.map((email, i) => [
          /* Sender */
          <div key={`s${email.id}`} style={{ gridColumn: 1, gridRow: i + 1, paddingRight: 8, paddingBottom: 12 }}>
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
          <div key={`lb${email.id}`} className="relative"
            style={{ gridColumn: 2, gridRow: i + 1, paddingBottom: 12 }}>
            <BusConnector email={email} index={i} total={emails.length} side="left" />
          </div>,

          /* Right bus connector */
          <div key={`rb${email.id}`} className="relative"
            style={{ gridColumn: 4, gridRow: i + 1, paddingBottom: 12 }}>
            <BusConnector email={email} index={i} total={emails.length} side="right" />
          </div>,

          /* Inbox */
          <div key={`i${email.id}`} style={{ gridColumn: 5, gridRow: i + 1, paddingLeft: 8, paddingBottom: 12 }}>
            <AnimatePresence mode="wait">
              {email.status === "done" && email.result ? (
                <ResultCard key="result" email={email} />
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <EmptySlot />
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
        ])}
      </div>

      {/* Add email */}
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

      {/* Summary */}
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
