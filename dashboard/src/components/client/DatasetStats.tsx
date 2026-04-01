import type { ClientConfig, ClientDataStats } from "../../services/api";

const PROFILE_COLOR: Record<string, string> = {
  marketing: "text-amber-400",
  balanced:  "text-blue-400",
  phishing:  "text-red-400",
};

interface Props {
  stats: Record<string, ClientDataStats>;
  clients: ClientConfig[];
}

export function DatasetStats({ stats, clients }: Props) {
  const clientsWithStats = clients.filter((c) => stats[c.id]);
  if (!clientsWithStats.length) return null;

  // Top 5 most discriminating features (highest avg spam_mean − ham_mean)
  const firstStats = Object.values(stats)[0];
  const featureNames = firstStats ? Object.keys(firstStats.features) : [];
  const topFeatures = featureNames
    .map((feat) => {
      const avg =
        clientsWithStats.reduce((sum, c) => {
          const f = stats[c.id]?.features[feat];
          return f ? sum + (f.spam_mean - f.ham_mean) : sum;
        }, 0) / clientsWithStats.length;
      return { feat, diff: avg };
    })
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 6);

  const maxDiff = topFeatures[0]?.diff ?? 1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300">Dataset Statistics</h2>
        <p className="text-xs text-zinc-600 mt-0.5">Spam / ham distribution per client</p>
      </div>

      <div className="p-4 space-y-5">
        {/* Per-client distribution bars */}
        <div className="space-y-3">
          {clientsWithStats.map((c) => {
            const s = stats[c.id];
            const spamPct = s.spam_ratio * 100;
            const hamPct  = 100 - spamPct;
            return (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-300">{c.name}</span>
                    <span className={`text-[10px] font-mono capitalize ${PROFILE_COLOR[c.profile] ?? "text-zinc-500"}`}>
                      {c.profile}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {s.total.toLocaleString()} emails
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-zinc-800 flex">
                  <div
                    className="h-full bg-red-500/60 transition-all duration-700"
                    style={{ width: `${spamPct}%` }}
                  />
                  <div className="h-full bg-emerald-500/60 flex-1" />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span className="text-red-500/80">{s.spam.toLocaleString()} spam ({spamPct.toFixed(0)}%)</span>
                  <span className="text-emerald-500/80">{s.ham.toLocaleString()} ham ({hamPct.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top discriminating features */}
        {topFeatures.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Top spam indicators (spam mean − ham mean)
            </p>
            <div className="space-y-1.5">
              {topFeatures.map(({ feat, diff }) => (
                <div key={feat} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-400 w-44 shrink-0 truncate">{feat}</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70 rounded-full transition-all duration-700"
                      style={{ width: `${(diff / maxDiff) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-amber-500/80 w-10 text-right shrink-0">
                    +{diff.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
