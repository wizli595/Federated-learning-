import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listClients, createClient, deleteClient,
  generateAllData, generateClientData, dataStatus, dataStats,
} from "../services/api";
import type { ClientConfig, ClientDataStats } from "../services/api";
import { Plus, Database, Loader2, CheckCircle } from "lucide-react";
import PageShell from "../components/PageShell";
import { WorkflowSteps } from "../components/client/WorkflowSteps";
import { ClientCard } from "../components/client/ClientCard";
import { AddClientForm } from "../components/client/AddClientForm";
import { DatasetStats } from "../components/client/DatasetStats";

const empty = (): ClientConfig => ({
  id: "", name: "", profile: "balanced", num_emails: 800,
});

const UsersIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={1.5}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function ClientManager() {
  const [clients,    setClients]    = useState<ClientConfig[]>([]);
  const [dsStatus,   setDsStatus]   = useState<Record<string, boolean>>({});
  const [stats,      setStats]      = useState<Record<string, ClientDataStats>>({});
  const [form,       setForm]       = useState<ClientConfig>(empty());
  const [formOpen,   setFormOpen]   = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  const refresh = async () => {
    const [c, s, st] = await Promise.all([
      listClients(),
      dataStatus(),
      dataStats().catch(() => ({} as Record<string, ClientDataStats>)),
    ]);
    setClients(c);
    setDsStatus(s);
    setStats(st);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const errMsg = (e: unknown, fallback: string): string => {
    if (e && typeof e === "object" && "response" in e) {
      const detail = (e as { response: { data?: { detail?: unknown } } }).response.data?.detail;
      if (Array.isArray(detail))
        return detail.map((x) => (x as { msg?: string }).msg ?? JSON.stringify(x)).join("; ");
      if (typeof detail === "string") return detail;
    }
    return fallback;
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      toast.error(errMsg(e, "Data generation failed"), { id: tid });
    } finally { setGenerating(null); }
  };

  const handleGenerateOne = async (id: string) => {
    setGenerating(id);
    const tid = toast.loading(`Generating dataset for "${id}"…`);
    try {
      await generateClientData(id);
      await refresh();
      toast.success(`Dataset ready for "${id}"`, { id: tid });
    } catch (e) {
      toast.error(errMsg(e, "Data generation failed"), { id: tid });
    } finally { setGenerating(null); }
  };

  const allHaveData = clients.length > 0 && clients.every((c) => dsStatus[c.id]);

  const headerActions = (
    <>
      {clients.length > 0 && (
        <button
          onClick={handleGenerateAll}
          disabled={!!generating}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400
                     border border-emerald-500/20 text-sm hover:bg-emerald-500/20 transition disabled:opacity-50"
        >
          {generating === "all" ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
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
    <PageShell title="Client Manager" subtitle="Each client simulates a user with their own private email inbox.">
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
      <WorkflowSteps clientCount={clients.length} allHaveData={allHaveData} />

      {formOpen && (
        <AddClientForm
          form={form}
          onChange={setForm}
          onSubmit={handleCreate}
          onCancel={() => { setFormOpen(false); setForm(empty()); }}
        />
      )}

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-800
                        rounded-2xl text-zinc-500 space-y-3 bg-zinc-900/30">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60
                          flex items-center justify-center">
            <UsersIcon size={24} className="text-zinc-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-zinc-400">No clients yet</p>
            <p className="text-xs text-zinc-600">Add your first FL participant to get started</p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500
                       text-white text-sm font-medium transition shadow-lg shadow-blue-900/30"
          >
            <Plus size={14} /> Add Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              hasData={!!dsStatus[c.id]}
              generating={generating}
              onDelete={handleDelete}
              onGenerate={handleGenerateOne}
            />
          ))}
        </div>
      )}

      <DatasetStats stats={stats} clients={clients} />

      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20
                        flex items-center justify-center">
          <CheckCircle size={13} className="text-emerald-500" />
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          <span className="text-zinc-300 font-medium">Privacy by design — </span>
          Each client's raw email data stays in its local directory and is never sent to the server.
          Only model weights (with DP noise applied) are shared during federated training rounds.
        </p>
      </div>
    </PageShell>
  );
}
