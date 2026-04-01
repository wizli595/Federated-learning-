import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Download, X, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { classifyBatch } from "../../services/api";
import type { BatchClassifyResult } from "../../services/api";
import { FEATURE_NAMES, FEATURE_LABELS, SPAM_INDICATORS } from "./featureMeta";

interface Props {
  clientId: string;
}

function topSpamFeature(bd: Record<string, number>): string {
  let k = "", v = -1;
  for (const key of SPAM_INDICATORS) {
    if ((bd[key] ?? 0) > v) { v = bd[key] ?? 0; k = key; }
  }
  return v > 0 ? `${FEATURE_LABELS[k] ?? k}: ${v.toFixed(2)}` : "—";
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function BatchPanel({ clientId }: Props) {
  const [batchFile,    setBatchFile]    = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<BatchClassifyResult[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spamCnt = batchResults?.filter((r) => r.label === "spam").length ?? 0;
  const hamCnt  = batchResults ? batchResults.length - spamCnt : 0;
  const avgConf = batchResults
    ? batchResults.reduce((s, r) => s + r.confidence, 0) / batchResults.length
    : 0;

  const onFileDrop = (f: File) => {
    if (!f.name.endsWith(".csv")) { toast.error("Only .csv files accepted"); return; }
    setBatchFile(f);
    setBatchResults(null);
  };

  const downloadTemplate = () => {
    const csv = [
      FEATURE_NAMES.join(","),
      "120,800,0.35,5,1,4,6,0.08,0.12,55,0.4,3,0,1,15,0.25,2,3,0,0.18",
      "45,290,0.03,0,1,0,0,0.01,0.01,22,0.04,0,0,0,9,0.0,0,0,1,0.04",
    ].join("\n");
    triggerDownload(new Blob([csv], { type: "text/csv" }), "features_template.csv");
  };

  const downloadResults = () => {
    if (!batchResults) return;
    const header = [...FEATURE_NAMES, "label", "confidence", "spam_score"].join(",");
    const rows   = batchResults.map((r) => [
      ...FEATURE_NAMES.map((f) => r.feature_breakdown[f] ?? 0),
      r.label, r.confidence, r.spam_score,
    ].join(","));
    triggerDownload(new Blob([[header, ...rows].join("\n")], { type: "text/csv" }), "batch_results.csv");
  };

  const handleBatchClassify = async () => {
    if (!batchFile) return;
    setBatchLoading(true);
    setBatchResults(null);
    try {
      const results = await classifyBatch(clientId, batchFile);
      setBatchResults(results);
      const sc = results.filter((r) => r.label === "spam").length;
      toast.success(`${results.length} emails — ${sc} spam, ${results.length - sc} ham`, { duration: 4000 });
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? "Batch classification failed — is the model trained?");
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 flex-1">

      {/* Upload row */}
      <div className="grid grid-cols-[1fr_auto] gap-5 items-start">

        {/* Drop zone card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/50">
            <div>
              <p className="text-sm font-semibold text-zinc-200">Bulk Classification</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Upload a CSV with 20 feature columns — max 1 000 rows
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border
                         border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition"
            >
              <FileText size={11} /> Template CSV
            </button>
          </div>

          <div className="p-5">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFileDrop(f); }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 h-44 rounded-xl
                          border-2 border-dashed cursor-pointer transition-all
                          ${dragOver
                            ? "border-blue-500 bg-blue-500/5 scale-[1.01]"
                            : batchFile
                            ? "border-emerald-500/50 bg-emerald-500/4"
                            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
                          }`}
            >
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                     onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileDrop(f); }} />

              {batchFile ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                                  flex items-center justify-center">
                    <FileText size={22} className="text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-emerald-400">{batchFile.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{(batchFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setBatchFile(null); setBatchResults(null); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-600
                               hover:text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    <X size={13} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60
                                  flex items-center justify-center">
                    <Upload size={22} className="text-zinc-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-zinc-400">
                      Drop your CSV here, or{" "}
                      <span className="text-blue-400 hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">UTF-8 · max 1 000 rows</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleBatchClassify}
              disabled={!batchFile || batchLoading}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
                         transition disabled:opacity-40 disabled:cursor-not-allowed
                         shadow-lg shadow-blue-900/25"
            >
              {batchLoading
                ? <><Loader2 size={14} className="animate-spin" /> Classifying…</>
                : <><Upload size={14} /> Classify Batch</>
              }
            </button>
          </div>
        </div>

        {/* Stats sidebar */}
        {batchResults && (
          <div className="flex flex-col gap-3 w-52">
            {[
              { label: "Total",          value: batchResults.length,          color: "text-zinc-200" },
              { label: "Spam",           value: spamCnt,                      color: "text-red-400" },
              { label: "Ham",            value: hamCnt,                       color: "text-emerald-400" },
              { label: "Avg Confidence", value: `${(avgConf * 100).toFixed(1)}%`, color: "text-blue-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results table */}
      {batchResults && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden flex-1">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <p className="text-sm font-semibold text-zinc-200">
              Classification Results
              <span className="ml-2 text-xs font-normal text-zinc-500">{batchResults.length} rows</span>
            </p>
            <button
              onClick={downloadResults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border
                         border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition"
            >
              <Download size={11} /> Download CSV
            </button>
          </div>

          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
                <tr>
                  {["#", "Label", "Confidence", "Spam Score", "Top Triggered Feature"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-zinc-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {batchResults.map((r) => {
                  const spam = r.label === "spam";
                  return (
                    <tr key={r.row} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-2.5 text-zinc-600 font-mono">{r.row}</td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                         text-[10px] font-bold uppercase tracking-wide
                          ${spam
                            ? "bg-red-400/10 text-red-400 border border-red-400/20"
                            : "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                          }`}>
                          {spam ? <ShieldAlert size={9} /> : <ShieldCheck size={9} />}
                          {r.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 bg-zinc-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${spam ? "bg-red-400" : "bg-emerald-400"}`}
                              style={{ width: `${r.confidence * 100}%` }}
                            />
                          </div>
                          <span className={`font-mono font-semibold ${spam ? "text-red-400" : "text-emerald-400"}`}>
                            {(r.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5 font-mono text-zinc-500">{r.spam_score.toFixed(3)}</td>
                      <td className="px-5 py-2.5 text-zinc-400">{topSpamFeature(r.feature_breakdown)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
