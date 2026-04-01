import { useNavigate } from "react-router-dom";
import { Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Inbox } from "lucide-react";
import type { ClientConfig } from "../../services/api";
import { PROFILE_COLOR, PROFILE_DESC, PROFILE_GRADIENT } from "./profileMeta";

interface Props {
  client: ClientConfig;
  hasData: boolean;
  generating: string | null;
  onDelete: (id: string) => void;
  onGenerate: (id: string) => void;
}

export function ClientCard({ client: c, hasData, generating, onDelete, onGenerate }: Props) {
  const navigate = useNavigate();

  return (
    <div className="group flex flex-col gap-4 p-5 rounded-2xl border border-zinc-800
                    bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${PROFILE_GRADIENT[c.profile] ?? "from-zinc-600 to-zinc-700"}
                          flex items-center justify-center text-white text-base font-bold shadow-lg shrink-0`}>
            {c.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-100">{c.name}</span>
              <span className="text-[10px] text-zinc-600 font-mono bg-zinc-800 px-1.5 py-0.5 rounded-md">{c.id}</span>
            </div>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-semibold mt-1 ${PROFILE_COLOR[c.profile]}`}>
              {c.profile}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(c.id)}
          className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-400/10
                     transition opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <p className="text-xs text-zinc-600 leading-relaxed">{PROFILE_DESC[c.profile]}</p>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-zinc-500">{c.num_emails.toLocaleString()} emails</span>
        <span className="text-zinc-800">·</span>
        {hasData
          ? <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle size={11} /> Dataset ready
            </span>
          : <span className="flex items-center gap-1 text-zinc-600">
              <XCircle size={11} /> No dataset
            </span>
        }
      </div>

      <div className="flex gap-2 pt-3 border-t border-zinc-800/70 mt-auto">
        <button
          onClick={() => onGenerate(c.id)}
          disabled={!!generating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200
                     border border-zinc-700/60 transition disabled:opacity-50"
        >
          {generating === c.id
            ? <Loader2 size={11} className="animate-spin" />
            : <RefreshCw size={11} />
          }
          {generating === c.id ? "Generating…" : "Generate Data"}
        </button>
        <button
          onClick={() => navigate(`/clients/${c.id}/inbox`)}
          disabled={!hasData}
          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                     bg-blue-500/10 text-blue-400 border border-blue-500/20
                     hover:bg-blue-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed font-medium"
        >
          <Inbox size={11} /> Open Inbox
        </button>
      </div>
    </div>
  );
}
