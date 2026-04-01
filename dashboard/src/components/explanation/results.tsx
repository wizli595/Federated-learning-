export function Experiments() {
  const rows = [
    { algo: "FedAvg",          lr: "0.01",  profiles: "all three",  rounds: 10, acc: "~80%", osc: "±5%",  note: "Good baseline" },
    { algo: "FedAvg",          lr: "0.01",  profiles: "2 phishing", rounds: 10, acc: "~75%", osc: "±11%", note: "Phishing drift" },
    { algo: "FedProx μ=0.1",   lr: "0.01",  profiles: "all three",  rounds: 10, acc: "~78%", osc: "±4%",  note: "More stable" },
    { algo: "FedAvg",          lr: "0.001", profiles: "all three",  rounds: 10, acc: "~65%", osc: "±3%",  note: "Underfit" },
    { algo: "FedAvg",          lr: "0.01",  profiles: "all three",  rounds: 20, acc: "~84%", osc: "±3%",  note: "Best overall" },
  ];

  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Indicative results from running the system with 300 emails per client, 5 local epochs:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700/60">
              {["Algorithm", "LR", "Profiles", "Rounds", "Best Acc", "Oscillation", "Note"].map((h) => (
                <th key={h} className="text-left py-2 pr-3 text-zinc-400 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-zinc-800/40">
                <td className="py-2 pr-3 font-mono text-zinc-200">{r.algo}</td>
                <td className="py-2 pr-3 text-zinc-400">{r.lr}</td>
                <td className="py-2 pr-3 text-zinc-400">{r.profiles}</td>
                <td className="py-2 pr-3 text-zinc-400">{r.rounds}</td>
                <td className="py-2 pr-3 text-emerald-400 font-semibold">{r.acc}</td>
                <td className="py-2 pr-3 text-amber-400">{r.osc}</td>
                <td className="py-2 text-zinc-600">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-4">
        <p className="text-xs text-zinc-300 font-semibold mb-1">Key findings</p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>20 rounds consistently outperforms 10 rounds with the same config.</li>
          <li>Balanced profile as a third client reduces oscillation significantly.</li>
          <li>FedProx reduces oscillation slightly but doesn't improve peak accuracy with 3 clients.</li>
          <li>Learning rate 0.001 underfits — 10 rounds is not enough for it to converge.</li>
        </ul>
      </div>
    </>
  );
}

export function PrivacyTable() {
  const rows = [
    { data: "Raw email text",           location: "Client only (fl/data/{id}/)",     shared: false, note: "Never transmitted anywhere" },
    { data: "Extracted features",        location: "Client only",                     shared: false, note: "Never leaves the client process" },
    { data: "Model weights (pre-noise)", location: "Client only",                     shared: false, note: "Discarded after DP noise is applied" },
    { data: "Model weights (post-DP)",   location: "Client → Flower server",          shared: true,  note: "Transmitted via gRPC — DP-noised" },
    { data: "Global model weights",      location: "Server → all clients",            shared: true,  note: "Written to fl/output/ and distributed" },
    { data: "Aggregate metrics",         location: "Server → controller → dashboard", shared: true,  note: "Only averages — no individual-level data" },
    { data: "Client config (profile, count)", location: "Controller",                 shared: true,  note: "Not sensitive — no email content" },
  ];

  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Exactly what leaves each boundary in this system:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700/60">
              {["Data", "Location", "Shared?", "Note"].map((h) => (
                <th key={h} className="text-left py-2 pr-4 text-zinc-400 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.data} className="border-b border-zinc-800/40">
                <td className="py-2 pr-4 text-zinc-200 font-mono text-[11px]">{r.data}</td>
                <td className="py-2 pr-4 text-zinc-400">{r.location}</td>
                <td className="py-2 pr-4">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${r.shared ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>
                    {r.shared ? "yes" : "never"}
                  </span>
                </td>
                <td className="py-2 text-zinc-500">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Glossary() {
  const terms: [string, string][] = [
    ["FedAvg",             "Federated Averaging — weighted mean of client weights by sample count."],
    ["FedProx",            "Extension of FedAvg with a proximal term limiting local model drift."],
    ["Round",              "One complete cycle: distribute weights → local train → collect → aggregate."],
    ["IID",                "Independent and Identically Distributed — each client is a fair sample of the global distribution."],
    ["Non-IID",            "Data distribution varies per client. More realistic but harder to converge."],
    ["Global model",       "The shared model weights on the server, updated each round via FedAvg."],
    ["Local epochs",       "Training iterations a client runs on its own data before submitting weights."],
    ["Aggregation",        "Combining client weight updates into a new global model."],
    ["DP",                 "Differential Privacy — adding calibrated noise to bound information leakage about individuals."],
    ["clip_norm",          "L2 norm clipping threshold. Bounds the sensitivity of each weight tensor."],
    ["noise_mult",         "DP noise multiplier. σ = noise_mult × clip_norm added to each clipped weight."],
    ["Spam profile",       "Per-client configuration that determines the distribution of spam types in the synthetic dataset."],
    ["Feature vector",     "20 normalized numeric values extracted from an email, used as model input instead of raw text."],
    ["Gradient inversion", "Attack where an adversary reconstructs training data from submitted weight updates."],
    ["Straggler",          "A client that is significantly slower than others, delaying the round."],
    ["metrics.json",       "JSON file written by the Flower server after each round; polled by the controller to serve training status."],
    ["global_model.pt",    "PyTorch state dict saved after the final training round; distributed to all client data directories."],
    ["Flower (flwr)",      "Open-source federated learning framework. Handles gRPC communication between server and clients."],
    ["gRPC",               "Google Remote Procedure Call — binary protocol used internally by Flower for weight exchange."],
  ];

  return (
    <dl className="space-y-2">
      {terms.map(([term, def]) => (
        <div key={term} className="grid grid-cols-[200px_1fr] gap-3">
          <dt className="font-mono text-blue-400 font-medium text-xs pt-0.5">{term}</dt>
          <dd className="text-zinc-400 text-xs leading-relaxed">{def}</dd>
        </div>
      ))}
    </dl>
  );
}
