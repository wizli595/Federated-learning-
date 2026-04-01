export function TrainingCfg() {
  const params = [
    { p: "rounds",        default: "10",      range: "1–100",          desc: "Number of complete FL rounds. Each round = distribute → train → aggregate. More rounds = better model up to convergence." },
    { p: "local_epochs",  default: "5",       range: "1–50",           desc: "How many epochs each client trains locally per round before submitting. More epochs = more local specialisation (can hurt non-IID convergence)." },
    { p: "learning_rate", default: "0.01",    range: "0.0001–1",       desc: "Adam learning rate for local training. 0.01 is a good starting point. Too high = unstable. Too low = slow convergence." },
    { p: "algorithm",     default: "fedavg",  range: "fedavg / fedprox", desc: "FedAvg: weighted average. FedProx: weighted average + proximal regularisation. Use FedProx when you have very non-IID profiles or partial participation." },
    { p: "mu",            default: "0.1",     range: "0–1",            desc: "FedProx proximal term strength. Only used when algorithm = fedprox. μ = 0 reduces to FedAvg." },
    { p: "clip_norm",     default: "1.0",     range: "0.1–10",         desc: "DP clipping threshold. Lower = stronger privacy, more noise impact. 1.0 is a reasonable default." },
    { p: "noise_mult",    default: "0.05",    range: "0–1",            desc: "DP noise multiplier. σ = noise_mult × clip_norm. 0.05 adds mild noise with minimal accuracy impact. Set to 0 to disable DP." },
    { p: "min_clients",   default: "2",       range: "1–N",            desc: "Minimum clients required per round. Training won't start until this many are connected. Must be ≤ number of configured clients." },
  ];

  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Every parameter in the Training configuration panel explained:
      </p>
      <div className="space-y-0 divide-y divide-zinc-800/50 rounded-xl overflow-hidden border border-zinc-800">
        {params.map(({ p, default: def, range, desc }) => (
          <div key={p} className="px-4 py-3 grid grid-cols-[1fr_2fr] gap-4">
            <div>
              <p className="text-xs font-mono font-semibold text-zinc-200">{p}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">default: <span className="text-zinc-400">{def}</span></p>
              <p className="text-[10px] text-zinc-600">range: <span className="text-zinc-400">{range}</span></p>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed self-center">{desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function MetricsGuide() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Metrics are computed by each Flower client on their held-out test split (20% of dataset) after each
        local training phase, then averaged across all clients by the server weighted by sample count.
        Written to <code className="text-zinc-300 text-xs">fl/output/metrics.json</code> after each round.
      </p>
      <div className="space-y-3">
        {[
          { t: "avg_loss (↓ better)",    d: "Cross-entropy loss averaged across all clients. Measures model confidence and correctness. Should decrease over rounds." },
          { t: "avg_accuracy (↑ better)", d: "Fraction of test emails correctly classified. Increases as the global model improves. Expect 70–85% on these profiles after 10 rounds." },
          { t: "spam_rate",              d: "Fraction of test emails predicted as spam. A useful sanity check — should roughly match the client's profile spam ratio." },
          { t: "Round history table",    d: "Shows every round in reverse order: loss, accuracy, participating clients, timestamp. Use this to identify rounds with unusual behaviour." },
          { t: "Convergence chart",      d: "Loss (red) and accuracy (green) over rounds. Well-converging runs show monotonically improving curves. Oscillating curves indicate non-IID conflict or learning rate too high." },
          { t: "Per-client breakdown",   d: "Each RoundMetric includes a clients dict with per-client loss, accuracy, spam_rate, num_samples. Useful for diagnosing which client is lagging." },
        ].map(({ t, d }) => (
          <div key={t} className="flex gap-3">
            <div className="text-xs font-semibold text-zinc-300 w-48 shrink-0 pt-0.5 font-mono">{t}</div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}
