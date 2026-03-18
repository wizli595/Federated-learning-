import { type RoundMetric } from "../../services/api";

const PALETTE = [
  "#22d3ee", "#34d399", "#f59e0b", "#f472b6",
  "#818cf8", "#fb7185", "#a3e635", "#e879f9",
];

function clientColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return PALETTE[hash % PALETTE.length];
}

interface Props {
  metrics: RoundMetric[];
}

export default function RoundTimeline({ metrics }: Props) {
  const allClients = [...new Set(metrics.flatMap((m) => Object.keys(m.per_client)))].sort();

  if (metrics.length === 0 || allClients.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-sm font-medium text-zinc-300 mb-1">Round Timeline</h2>
      <p className="text-xs text-zinc-500 mb-5">
        Which clients submitted each round — hover a cell for loss / accuracy
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {/* Round column */}
              <th className="text-left text-zinc-600 font-normal pb-3 pr-4 w-16 shrink-0">Round</th>
              {/* Client columns */}
              {allClients.map((id) => (
                <th key={id} className="pb-3 px-1 font-normal min-w-[72px]">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="h-1.5 w-8 rounded-full"
                      style={{ backgroundColor: clientColor(id) }}
                    />
                    <span className="text-zinc-400 font-mono truncate max-w-[80px]" title={id}>
                      {id.length > 9 ? id.slice(0, 9) + "…" : id}
                    </span>
                  </div>
                </th>
              ))}
              {/* Duration column */}
              <th className="text-right text-zinc-600 font-normal pb-3 pl-4">Duration</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.round} className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                {/* Round number */}
                <td className="py-2 pr-4 text-zinc-400 font-mono">{m.round}</td>

                {/* Per-client cells */}
                {allClients.map((id) => {
                  const sub = m.per_client[id];
                  return (
                    <td key={id} className="py-2 px-1 text-center">
                      {sub ? (
                        <span
                          className="group relative inline-flex items-center justify-center w-8 h-6 rounded-md cursor-default"
                          style={{ backgroundColor: clientColor(id) + "22", border: `1px solid ${clientColor(id)}44` }}
                        >
                          {/* Check mark */}
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke={clientColor(id)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>

                          {/* Hover tooltip */}
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
                                           hidden group-hover:flex flex-col items-start gap-0.5
                                           bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap">
                            <span className="font-mono text-[10px]" style={{ color: clientColor(id) }}>{id}</span>
                            {sub.accuracy != null && (
                              <span className="text-zinc-300">
                                acc: <span className="text-emerald-400 font-medium">{(sub.accuracy * 100).toFixed(2)}%</span>
                              </span>
                            )}
                            {sub.loss != null && (
                              <span className="text-zinc-300">
                                loss: <span className="text-blue-400 font-medium">{sub.loss.toFixed(4)}</span>
                              </span>
                            )}
                            {sub.num_samples != null && (
                              <span className="text-zinc-500">
                                {sub.num_samples} samples
                              </span>
                            )}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-zinc-800/30">
                          <span className="text-zinc-700 text-[10px] select-none">—</span>
                        </span>
                      )}
                    </td>
                  );
                })}

                {/* Duration */}
                <td className="py-2 pl-4 text-right text-zinc-500 font-mono tabular-nums">
                  {m.duration_seconds != null
                    ? m.duration_seconds < 60
                      ? `${m.duration_seconds.toFixed(1)}s`
                      : `${Math.floor(m.duration_seconds / 60)}m ${(m.duration_seconds % 60).toFixed(0)}s`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend row */}
      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-4 text-[10px] text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-4 rounded bg-emerald-500/10 border border-emerald-500/30">
            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Submitted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-4 rounded bg-zinc-800/30 border border-zinc-700/30">
            <span className="text-zinc-700 text-[9px]">—</span>
          </span>
          Did not participate
        </span>
      </div>
    </div>
  );
}
