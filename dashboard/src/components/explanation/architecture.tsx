import { FLOW_COLORS } from "./helpers";

export function Architecture() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed mb-2">
        Three independently deployable services communicate over HTTP only — no shared imports, no shared database.
      </p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {
            name: "Controller", port: ":8080", color: "text-red-400", border: "border-red-500/20 bg-red-500/5",
            desc: "FastAPI orchestration layer. Manages client configs, spawns Flower subprocesses, serves the classify endpoint.",
          },
          {
            name: "FL Layer", port: ":8090", color: "text-blue-400", border: "border-blue-500/20 bg-blue-500/5",
            desc: "Flower server + Flower clients. Handles gRPC-based weight exchange, FedAvg/FedProx aggregation, metrics writing.",
          },
          {
            name: "Dashboard", port: ":5173", color: "text-emerald-400", border: "border-emerald-500/20 bg-emerald-500/5",
            desc: "React + Vite UI. Polls the controller API every 2 s during training. Sends all actions as HTTP requests.",
          },
        ].map(({ name, port, color, border, desc }) => (
          <div key={name} className={`rounded-xl border p-3 ${border}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold font-mono ${color}`}>{name}</span>
              <span className="text-[10px] text-zinc-600 font-mono">{port}</span>
            </div>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-zinc-400 mb-2">Training sequence (internal):</p>
      <div className="flex flex-col gap-0">
        {[
          { n: "A", color: "blue",    label: "POST /training/start",    detail: "Dashboard sends config (rounds, epochs, algorithm, DP params). Controller validates that all clients have datasets." },
          { n: "B", color: "amber",   label: "Spawn fl/server.py",      detail: "Controller starts the Flower server subprocess on port 8090 with the given config flags." },
          { n: "C", color: "amber",   label: "Spawn fl/client.py × N",  detail: "Controller spawns one Flower client process per configured client, each pointing at its own dataset CSV." },
          { n: "D", color: "emerald", label: "Flower round (gRPC)",     detail: "Server sends global weights → each client trains locally for local_epochs → applies DP noise → submits weights + metrics via gRPC." },
          { n: "E", color: "purple",  label: "FedAvg aggregation",      detail: "Server computes weighted average of all client weights (weighted by num_samples). Writes round metrics to fl/output/metrics.json." },
          { n: "F", color: "red",     label: "Repeat for all rounds",   detail: "Steps D–E repeat for the configured number of rounds. Dashboard polls /training/status and updates the chart." },
          { n: "G", color: "cyan",    label: "Model distribution",      detail: "After the final round, server saves fl/output/global_model.pt. Controller detects exit and copies the model to fl/data/{id}/model.pt for every client." },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${FLOW_COLORS[s.color]}`}>
                {s.n}
              </div>
              {i < arr.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-1 min-h-[16px]" />}
            </div>
            <div className="pb-3">
              <p className="text-xs font-medium text-zinc-200 font-mono">{s.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
        <p className="text-xs font-semibold text-zinc-300 mb-2">Shared files (via volume mount)</p>
        <div className="space-y-1 text-xs font-mono">
          {[
            ["fl/output/metrics.json",     "text-blue-400",   "Written by Flower server after each round; polled by controller"],
            ["fl/output/global_model.pt",  "text-emerald-400","Final aggregated model; copied to each client dir on completion"],
            ["fl/data/{id}/dataset.csv",   "text-amber-400",  "Per-client training data; written by generate script, read by Flower client"],
            ["fl/data/{id}/model.pt",      "text-violet-400", "Per-client copy of global model; used by classifier endpoint"],
            ["controller/app/clients/",    "text-red-400",    "JSON config files; read by Flower client spawner + data generator"],
          ].map(([path, color, desc]) => (
            <div key={path} className="flex gap-3 items-start">
              <span className={`${color} w-64 shrink-0`}>{path}</span>
              <span className="text-zinc-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function Profiles() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Each client gets a <span className="text-zinc-200">spam profile</span> that controls the distribution
        of email features in their dataset. This creates realistic non-IID data — each client sees a
        fundamentally different slice of the spam problem.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            profile: "marketing", color: "text-amber-400", border: "border-amber-500/20 bg-amber-500/5",
            spam: "70% spam", dominant: ["high url_count", "spam_keyword_count", "html_ratio"],
            desc: "Bulk promotional emails — lots of links, discount offers, HTML-heavy layouts. Spam is obvious but not threatening.",
          },
          {
            profile: "phishing", color: "text-red-400", border: "border-red-500/20 bg-red-500/5",
            spam: "70% spam", dominant: ["high caps_ratio", "urgency_word_count", "reply_to_mismatch"],
            desc: "Credential harvesting — ALL CAPS, spoofed reply-to addresses, extreme urgency. The most dangerous spam type.",
          },
          {
            profile: "balanced", color: "text-blue-400", border: "border-blue-500/20 bg-blue-500/5",
            spam: "50% spam", dominant: ["mixed marketing", "+ phishing features"],
            desc: "Representative mix of both spam types plus plenty of ham. A reference distribution useful as a third client.",
          },
        ].map(({ profile, color, border, spam, dominant, desc }) => (
          <div key={profile} className={`rounded-xl border p-3 ${border}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold font-mono capitalize ${color}`}>{profile}</span>
              <span className="text-[10px] text-zinc-500">{spam}</span>
            </div>
            <p className="text-xs text-zinc-500 mb-2">{desc}</p>
            <div className="space-y-0.5">
              {dominant.map((f) => (
                <span key={f} className={`block text-[10px] font-mono ${color}`}>{f}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Using three different profiles means FL is genuinely valuable here: a model trained only on Alice's
        marketing spam would score poorly on Bob's phishing emails, and vice versa. Federation merges
        knowledge from all three distributions.
      </p>
    </>
  );
}
