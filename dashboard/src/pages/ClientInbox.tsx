import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { listClients, classifyEmail, exportModelOnnx } from "../services/api";
import type {
  ClientConfig,
  ClassifyRequest,
  ClassifyResponse,
} from "../services/api";
import {
  Send,
  Shuffle,
  Loader2,
  ArrowLeft,
  Inbox,
  FileDown,
} from "lucide-react";
import { generateRandom } from "../components/inbox/emailSamples";
import { ClassifyResult } from "../components/inbox/ClassifyResult";
import { BatchPanel } from "../components/inbox/BatchPanel";

const PROFILE_GRADIENT: Record<string, string> = {
  marketing: "from-amber-500 to-orange-600",
  balanced: "from-blue-500 to-indigo-600",
  phishing: "from-red-500 to-rose-700",
};

export default function ClientInbox() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientConfig | null>(null);
  const [form, setForm] = useState<ClassifyRequest>({
    subject: "",
    body: "",
    sender: "",
    reply_to: "",
    has_attachment: false,
  });
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"single" | "batch">("single");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listClients().then((cs) =>
      setClient(cs.find((c) => c.id === clientId) ?? null),
    );
  }, [clientId]);

  const apiError = (e: unknown, fallback: string): string => {
    if (e && typeof e === "object" && "response" in e) {
      const detail = (e as { response: { data?: { detail?: unknown } } })
        .response.data?.detail;
      if (Array.isArray(detail))
        return detail
          .map((x) => (x as { msg?: string }).msg ?? JSON.stringify(x))
          .join("; ");
      if (typeof detail === "string") return detail;
    }
    return fallback;
  };

  const handleClassify = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await classifyEmail(clientId!, form);
      setResult(r);
      toast[r.label === "spam" ? "error" : "success"](
        `${r.label.toUpperCase()} — ${(r.confidence * 100).toFixed(1)}% confidence`,
        { duration: 3000 },
      );
    } catch (e) {
      toast.error(apiError(e, "Classification failed — is the model trained?"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportOnnx = async () => {
    setExporting(true);
    try {
      await exportModelOnnx(clientId!);
      toast.success("ONNX model downloaded", { duration: 3000 });
    } catch (e) {
      toast.error(apiError(e, "Export failed — is the model trained?"));
    } finally {
      setExporting(false);
    }
  };

  const profileColor =
    PROFILE_GRADIENT[client?.profile ?? "balanced"] ??
    "from-blue-500 to-violet-600";

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* ── Top bar ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/clients")}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition shrink-0">
            <ArrowLeft size={16} />
          </button>

          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${profileColor}
                           flex items-center justify-center text-white text-base font-bold shrink-0 shadow-lg`}>
            {client?.name[0]?.toUpperCase() ?? <Inbox size={18} />}
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-semibold text-zinc-100 leading-tight truncate">
              {client ? `${client.name}'s Inbox` : "Inbox Simulation"}
            </h1>
            <p className="text-xs text-zinc-500 leading-tight">
              {client
                ? `${client.profile} profile · ${client.num_emails.toLocaleString()} emails`
                : "Classify emails with the trained federated model"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportOnnx}
            disabled={exporting}
            title="Export model as ONNX — runs anywhere without PyTorch"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border
                       border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500
                       transition disabled:opacity-40">
            {exporting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <FileDown size={12} />
            )}
            Export ONNX
          </button>

          <div className="flex gap-0.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
            {(["single", "batch"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition
                  ${
                    tab === t
                      ? "bg-zinc-700 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}>
                {t === "single" ? "Single Email" : "Batch CSV"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Single Email tab ══════════════════════════════════════════════════════ */}
      {tab === "single" && (
        <div className="flex gap-5 flex-1 min-h-[calc(100vh-14rem)]">
          {/* Compose panel */}
          <div className="flex-1 flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/60">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                New Classification
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-600 mr-1">
                  Generate:
                </span>
                {(["marketing", "phishing", "ham"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setForm(generateRandom(t));
                      setResult(null);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border transition capitalize
                      ${
                        t === "marketing"
                          ? "bg-amber-400/10 text-amber-400 border-amber-400/20 hover:bg-amber-400/20"
                          : t === "phishing"
                            ? "bg-red-400/10   text-red-400   border-red-400/20   hover:bg-red-400/20"
                            : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
                      }`}>
                    <Shuffle size={9} /> {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Email fields */}
            {(
              [
                { key: "sender",   label: "From",     placeholder: "sender@example.com", dim: false },
                { key: "reply_to", label: "Reply-To", placeholder: "(optional)",         dim: true  },
                { key: "subject",  label: "Subject",  placeholder: "Email subject line", dim: false },
              ] as { key: keyof ClassifyRequest; label: string; placeholder: string; dim: boolean }[]
            ).map(({ key, label, placeholder, dim }) => (
                <div
                  key={key}
                  className="flex items-center px-5 py-3 border-b border-zinc-800/60 gap-4 group
                              hover:bg-zinc-900/40 transition-colors">
                  <span className="text-[11px] font-medium text-zinc-600 w-16 shrink-0">
                    {label}
                  </span>
                  <input
                    className={`flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-800
                    ${key === "subject" ? "text-zinc-100 font-medium" : dim ? "text-zinc-500" : "text-zinc-300"}`}
                    placeholder={placeholder}
                    value={form[key] as string}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                </div>
            ))}

            <textarea
              className="flex-1 px-5 py-4 bg-transparent outline-none resize-none
                         text-sm text-zinc-300 placeholder:text-zinc-800 leading-relaxed"
              placeholder="Write or paste email body…"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />

            {/* Footer */}
            <div
              className="flex items-center justify-between px-5 py-3
                            border-t border-zinc-800/80 bg-zinc-900/60">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() =>
                    setForm({ ...form, has_attachment: !form.has_attachment })
                  }
                  className={`w-4 h-4 rounded border flex items-center justify-center transition
                    ${
                      form.has_attachment
                        ? "bg-blue-600 border-blue-600"
                        : "border-zinc-600 group-hover:border-zinc-400"
                    }`}>
                  {form.has_attachment && (
                    <svg
                      viewBox="0 0 10 10"
                      className="w-2.5 h-2.5 text-white"
                      fill="none">
                      <path
                        d="M2 5l2.5 2.5 3.5-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition">
                  Has attachment
                </span>
              </label>

              <button
                onClick={handleClassify}
                disabled={loading || (!form.subject && !form.body)}
                className="flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-sm
                           bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white
                           transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30">
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Classifying…
                  </>
                ) : (
                  <>
                    <Send size={14} /> Classify
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result panel */}
          <div className="w-[400px] xl:w-[440px] shrink-0 flex flex-col gap-4 overflow-y-auto">
            <ClassifyResult result={result} />
          </div>
        </div>
      )}

      {/* ══ Batch CSV tab ═════════════════════════════════════════════════════════ */}
      {tab === "batch" && <BatchPanel clientId={clientId!} />}
    </div>
  );
}
