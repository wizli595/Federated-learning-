import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  listClients, createClient, deleteClient,
  generateAllData, generateClientData, dataStatus,
} from "../services/api";
import type { ClientConfig } from "../services/api";
import { Plus, Trash2, RefreshCw, Database, CheckCircle, XCircle, Loader2, Inbox, ArrowRight, Play } from "lucide-react";
import PageShell from "../components/PageShell";

const PROFILES = ["marketing", "balanced", "phishing"] as const;

const PROFILE_DESC: Record<string, string> = {
  marketing: "70% spam — bulk promo emails vs transactional receipts (URL-heavy)",
  balanced:  "65% spam — credential phishing vs casual personal emails (CAPS + urgency)",
  phishing:  "55% spam — money scam emails vs professional work emails (money words)",
};

const PROFILE_COLOR: Record<string, string> = {
  marketing: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  balanced:  "text-blue-400   bg-blue-400/10   border-blue-400/20",
  phishing:  "text-red-400    bg-red-400/10    border-red-400/20",
};

const empty = (): ClientConfig => ({
  id: "", name: "", profile: "balanced", num_emails: 800,
});

export default function ClientManager() {
  const [clients,    setClients]    = useState<ClientConfig[]>([]);
  const [dsStatus,   setDsStatus]   = useState<Record<string, boolean>>({});
  const [form,       setForm]       = useState<ClientConfig>(empty());
  const [formOpen,   setFormOpen]   = useState(false);
  const [generating, setGenerating] = useState<string | null>(null); // "all" | client_id
  const [loading,    setLoading]    = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    const [c, s] = await Promise.all([listClients(), dataStatus()]);
    setClients(c);
    setDsStatus(s);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const errMsg = (e: any, fallback: string) => {
    const d = e.response?.data?.detail;
    return Array.isArray(d) ? d.map((x: any) => x.msg ?? JSON.stringify(x)).join("; ") : (d ?? fallback);
  };

  const handleCreate = async () => {
    if (!form.id.trim())   { toast.error("ID is required");   return; }
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const tid = toast.loading("Creating client…");
    try {
      await createClient(form);
      setForm(empty());
      setFormOpen(false);
      await refresh();
      toast.success(`Client "${form.id}" created`, { id: tid });
    } catch (e: any) {
      toast.error(errMsg(e, "Failed to create client"), { id: tid });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete client "${id}"? This also removes its data.`)) return;
    const tid = toast.loading("Deleting…");
    try {
      await deleteClient(id);
      await refresh();
      toast.success(`Client "${id}" deleted`, { id: tid });
    } catch (e: any) {
      toast.error(errMsg(e, "Failed to delete client"), { id: tid });
    }
  };

  const handleGenerateAll = async () => {
    setGenerating("all");
    const tid = toast.loading("Generating datasets for all clients…");
    try {
      await generateAllData();
      await refresh();
      toast.success("All datasets generated", { id: tid });
    } catch (e: any) {
      toast.error(errMsg(e, "Data generation failed"), { id: tid });
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateOne = async (id: string) => {
    setGenerating(id);
    const tid = toast.loading(`Generating dataset for "${id}"…`);
    try {
      await generateClientData(id);
      await refresh();
      toast.success(`Dataset ready for "${id}"`, { id: tid });
    } catch (e: any) {
      toast.error(errMsg(e, "Data generation failed"), { id: tid });
    } finally {
      setGenerating(null);
    }
  };

  const headerActions = (
    <>
      {clients.length > 0 && (
        <button
          onClick={handleGenerateAll}
          disabled={!!generating}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400
                     border border-emerald-500/20 text-sm hover:bg-emerald-500/20 transition disabled:opacity-50"
        >
          {generating === "all"
            ? <Loader2 size={14} className="animate-spin" />
            : <Database size={14} />
          }
          Generate All Data
        </button>
      )}
      <button
        onClick={() => setFormOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400
                   border border-blue-500/20 text-sm hover:bg-blue-500/20 transition"
      >
        <Plus size={14} /> Add Client
      </button>
    </>
  );

  if (loading) return (
    <PageShell
      title="Client Manager"
      subtitle="Each client simulates a user with their own private email inbox."
    >
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    </PageShell>
  );

  return (
    <PageShell
      title="Client Manager"
      subtitle="Each client simulates a user with their own private email inbox."
      actions={headerActions}
    >

      {/* 3-step workflow guide */}
      {(() => {
        const allHaveData = clients.length > 0 && clients.every((c) => dsStatus[c.id]);
        const step1Done = clients.length > 0;
        const step2Done = allHaveData;
        const currentStep = !step1Done ? 1 : !step2Done ? 2 : 3;

        return (
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { n: 1, label: "Add Clients",     desc: "Create FL participants",      done: step1Done },
                { n: 2, label: "Generate Data",   desc: "Synthesize email datasets",   done: step2Done },
                { n: 3, label: "Start Training",  desc: "Run federated learning",      done: false     },
              ].map(({ n, label, desc, done }, idx) => {
                const active = n === currentStep;
                return (
                  <div key={n} className="flex items-center gap-2">
                    {idx > 0 && (
                      <div className={`w-8 h-px shrink-0 ${done || n <= currentStep ? "bg-emerald-600/50" : "bg-zinc-700"}`} />
                    )}
                    <div className={`flex items-center gap-2 transition-opacity ${active ? "opacity-100" : done ? "opacity-60" : "opacity-30"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                        ${done ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                               : active ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                               : "bg-zinc-800 text-zinc-600 border border-zinc-700"}`}>
                        {done ? <CheckCircle size={12} /> : n}
                      </div>
                      <div>
                        <p className={`text-xs font-medium leading-none ${done ? "text-emerald-400" : active ? "text-zinc-200" : "text-zinc-500"}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {currentStep === 3 && (
                <button
                  onClick={() => navigate("/training")}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500
                             text-white text-xs font-medium transition shrink-0"
                >
                  <Play size={11} /> Go to Training <ArrowRight size={11} />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Add client form */}
      {formOpen && (
        <div className="p-5 rounded-xl border border-zinc-700 bg-zinc-800/50 space-y-4">
          <h2 className="text-sm font-medium text-zinc-200">New Client</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">ID (slug)</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500"
                placeholder="alice"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Display Name</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500"
                placeholder="Alice"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Spam Profile</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500"
                value={form.profile}
                onChange={(e) => setForm({ ...form, profile: e.target.value as any })}
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <p className="text-xs text-zinc-600">{PROFILE_DESC[form.profile]}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Number of Emails</label>
              <input
                type="number" min={50} max={2000}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100
                           text-sm focus:outline-none focus:border-blue-500"
                value={form.num_emails}
                onChange={(e) => setForm({ ...form, num_emails: parseInt(e.target.value) || 300 })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition"
            >
              Create
            </button>
            <button
              onClick={() => { setFormOpen(false); setForm(empty()); }}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Client cards */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-700
                        rounded-xl text-zinc-500 space-y-2">
          <Users size={32} className="text-zinc-700" />
          <p className="text-sm">No clients yet — add one to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-4 rounded-xl border border-zinc-800
                         bg-zinc-900 hover:border-zinc-700 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center
                                text-zinc-300 font-semibold text-sm uppercase">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{c.name}</span>
                    <span className="text-xs text-zinc-600 font-mono">{c.id}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PROFILE_COLOR[c.profile]}`}>
                      {c.profile}
                    </span>
                    <span className="text-xs text-zinc-500">{c.num_emails} emails</span>
                    {dsStatus[c.id]
                      ? <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle size={11} /> dataset ready
                        </span>
                      : <span className="flex items-center gap-1 text-xs text-zinc-600">
                          <XCircle size={11} /> no dataset
                        </span>
                    }
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateOne(c.id)}
                  disabled={!!generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                             bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200
                             transition disabled:opacity-50"
                >
                  {generating === c.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RefreshCw size={12} />
                  }
                  Generate Data
                </button>
                <button
                  onClick={() => navigate(`/clients/${c.id}/inbox`)}
                  disabled={!dsStatus[c.id]}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                             bg-blue-500/10 text-blue-400 border border-blue-500/20
                             hover:bg-blue-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Inbox size={12} /> Open Inbox
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Privacy note */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="text-zinc-300 font-medium">Privacy: </span>
          Each client's raw email data stays in its local directory and is never sent to the server.
          Only model weights (with DP noise applied) are shared during federated training.
        </p>
      </div>
    </PageShell>
  );
}

// needed for the empty state icon import
function Users({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={1.5}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
