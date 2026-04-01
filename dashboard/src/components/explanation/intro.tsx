import { FLOW_COLORS } from "./helpers";

export function AppFlow() {
  const steps = [
    {
      n: "1", color: "blue", label: "Create Clients",
      ui: "Clients → Add Client", api: "POST /clients",
      detail: "Fill in an ID (slug), display name, spam profile (marketing / balanced / phishing), and email count (50–2000). The controller saves a JSON config and creates fl/data/{id}/ on disk. Each client represents a user with their own private inbox.",
    },
    {
      n: "2", color: "amber", label: "Generate Email Datasets",
      ui: "Clients → Generate Data / Generate All Data", api: "POST /data/generate",
      detail: "The controller runs scripts/generate_email_data.py for every configured client. Each client gets a synthetic email CSV with 20 extracted features + a spam label, distributed according to their profile (non-IID). Raw email text is never stored — only the 20 numeric features.",
    },
    {
      n: "3", color: "emerald", label: "Start Federated Training",
      ui: "Training → Start Training", api: "POST /training/start",
      detail: "The controller spawns fl/server.py (Flower server on port 8090) then one fl/client.py process per configured client. The dashboard polls GET /training/status every 2 seconds and shows live round progress.",
    },
    {
      n: "4", color: "purple", label: "Flower Training Rounds",
      ui: "Training page — live chart", api: "Flower gRPC (internal)",
      detail: "Each round: server sends global weights → each client loads its dataset, trains locally for N epochs, applies DP noise (clip + Gaussian), and submits via gRPC. Server aggregates with FedAvg (or FedProx), writes metrics to fl/output/metrics.json, starts the next round.",
    },
    {
      n: "5", color: "red", label: "Automatic Model Distribution",
      ui: "Training page — status turns 'finished'", api: "(background, no UI action needed)",
      detail: "After the final round, the Flower server saves fl/output/global_model.pt. The controller detects the server process has exited and automatically copies the model to fl/data/{id}/model.pt for every client.",
    },
    {
      n: "6", color: "cyan", label: "Inbox Simulation & Classification",
      ui: "Clients → Open Inbox", api: "POST /clients/{id}/classify",
      detail: "Compose or generate a test email. The controller extracts the 20 features from the raw text fields (subject, body, sender, reply-to, has_attachment), loads the trained model, runs inference, and returns { label, confidence, feature_breakdown }. The inbox shows SPAM / HAM + confidence bar + which features triggered the prediction.",
    },
  ];

  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        The complete user journey from zero to classifying emails:
      </p>
      <div className="flex flex-col gap-0">
        {steps.map((s, i) => (
          <div key={s.n} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${FLOW_COLORS[s.color]}`}>
                {s.n}
              </div>
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-zinc-800 my-1 min-h-[24px]" />
              )}
            </div>
            <div className="pb-5">
              <p className="text-sm font-semibold text-zinc-100">{s.label}</p>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">{s.api}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">UI: {s.ui}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-zinc-300">Quick start (3 clients)</p>
        <ol className="space-y-1 text-xs text-zinc-500 list-decimal list-inside">
          <li>Add client: id=<code className="text-zinc-300">alice</code>, profile=<code className="text-zinc-300">marketing</code>, 300 emails</li>
          <li>Add client: id=<code className="text-zinc-300">bob</code>, profile=<code className="text-zinc-300">phishing</code>, 300 emails</li>
          <li>Add client: id=<code className="text-zinc-300">carol</code>, profile=<code className="text-zinc-300">balanced</code>, 300 emails</li>
          <li>Click <span className="text-zinc-300">Generate All Data</span></li>
          <li>Go to Training → set rounds=10, min clients=3 → <span className="text-zinc-300">Start Training</span></li>
          <li>After training finishes, open any inbox and classify a test email</li>
        </ol>
      </div>
    </>
  );
}

export function WhatIsFL() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Federated Learning (FL) is a machine learning paradigm where a model is trained across multiple
        decentralized devices — <span className="text-zinc-200">without sharing raw data</span>. Each
        participant trains on their own private dataset and only sends model weight updates to a central server.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { t: "Privacy",      d: "Raw data never leaves the client. Only weight tensors are transmitted." },
          { t: "Collaboration", d: "Clients improve a shared global model together across many rounds." },
          { t: "Scale",        d: "Works across thousands of devices in parallel with no shared storage." },
        ].map(({ t, d }) => (
          <div key={t} className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-zinc-200 mb-1">{t}</p>
            <p className="text-xs text-zinc-500">{d}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Classical centralized ML collects all data on one server. FL inverts this: the{" "}
        <span className="text-zinc-200">model travels to the data</span> instead of the data traveling to
        the model. This is essential for regulated domains (healthcare, finance, private communications)
        where data cannot leave its origin.
      </p>
    </>
  );
}

export function WhyFLEmail() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Email inboxes are among the most private datasets a person owns. Centralising them for spam
        training would expose private communications to a third party. FL solves this directly.
      </p>
      <div className="space-y-3">
        {[
          {
            t: "Each user has unique spam patterns", c: "text-blue-400",
            d: "A marketing professional receives a different kind of spam than a developer or a student. A single centralized model trained on pooled data averages out these differences. FL allows the global model to learn from all distributions while each client's local data stays private.",
          },
          {
            t: "Non-IID is natural here", c: "text-amber-400",
            d: "This app simulates three distinct spam profiles (marketing, phishing, balanced). Each type has different dominant features (url_count vs caps_ratio vs urgency_words). Without FL, a model trained only on marketing spam would miss phishing patterns — and vice versa.",
          },
          {
            t: "Federation improves all clients", c: "text-emerald-400",
            d: "After training, every client receives the same global model that has learned from all profiles. Alice's inbox can now detect phishing-style spam she never saw locally, because Bob's phishing data contributed to training — without Alice ever seeing Bob's emails.",
          },
          {
            t: "Inference is local too", c: "text-violet-400",
            d: "Email classification happens locally: raw text is processed into 20 features on-device and run through the model — the raw email text itself is never sent anywhere. This matches how a production FL deployment would work.",
          },
        ].map(({ t, c, d }) => (
          <div key={t} className="flex gap-3">
            <div className={`text-xs font-semibold ${c} w-52 shrink-0 pt-0.5`}>{t}</div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}
