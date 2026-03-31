import { useState } from "react";
import {
  ChevronDown,
  Shield,
  Server,
  GitMerge,
  Database,
  Lock,
  Shuffle,
  Cpu,
  BarChart2,
  Zap,
  Mail,
  Users,
  PlayCircle,
  FlaskConical,
} from "lucide-react";
import PageShell from "../components/PageShell";

/* ── Section registry ────────────────────────────────────── */

const SECTIONS = [
  { id: "app-flow",      icon: Zap,          color: "text-blue-400",    title: "Full App Flow — Step by Step" },
  { id: "what-is-fl",   icon: Shield,        color: "text-violet-400",  title: "What is Federated Learning?" },
  { id: "why-fl-email", icon: Mail,          color: "text-emerald-400", title: "Why Federated Learning for Email Spam?" },
  { id: "architecture", icon: Server,        color: "text-red-400",     title: "System Architecture (3 Services)" },
  { id: "profiles",     icon: Users,         color: "text-amber-400",   title: "Client Profiles & Non-IID Data" },
  { id: "features",     icon: Database,      color: "text-cyan-400",    title: "Email Feature Set (20 Features)" },
  { id: "fedavg",       icon: GitMerge,      color: "text-blue-400",    title: "FedAvg Aggregation Algorithm" },
  { id: "fedprox",      icon: GitMerge,      color: "text-violet-400",  title: "FedProx — Proximal Term Algorithm" },
  { id: "dp",           icon: Lock,          color: "text-purple-400",  title: "Differential Privacy (DP Noise)" },
  { id: "model",        icon: Cpu,           color: "text-cyan-400",    title: "Model Architecture — TabularMLP" },
  { id: "non-iid",      icon: Shuffle,       color: "text-orange-400",  title: "Non-IID Challenges & Solutions" },
  { id: "training-cfg", icon: PlayCircle,    color: "text-green-400",   title: "Training Parameters Explained" },
  { id: "metrics",      icon: BarChart2,     color: "text-pink-400",    title: "Reading the Training Metrics" },
  { id: "experiments",  icon: FlaskConical,  color: "text-orange-400",  title: "Experiment Results" },
  { id: "privacy-table",icon: Shield,        color: "text-emerald-400", title: "Privacy Design — What Gets Shared" },
  { id: "glossary",     icon: Database,      color: "text-zinc-400",    title: "Glossary" },
];

/* ── Page ────────────────────────────────────────────────── */

export default function Explanation() {
  const [open, setOpen] = useState<string | null>("app-flow");

  return (
    <PageShell
      title="Documentation"
      subtitle="Everything about SpamFL — full app flow, algorithms, features, and privacy design."
      size="sm"
    >
      <div className="space-y-3">
      {SECTIONS.map(({ id, icon: Icon, color, title }) => (
        <div key={id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
            onClick={() => setOpen(open === id ? null : id)}
          >
            <div className="flex items-center gap-3">
              <Icon size={16} className={color} />
              <span className="text-sm font-medium text-zinc-200">{title}</span>
            </div>
            <ChevronDown
              size={15}
              className={`text-zinc-500 transition-transform duration-200 ${open === id ? "rotate-180" : ""}`}
            />
          </button>

          {open === id && (
            <div className="px-5 pb-5 pt-1 border-t border-zinc-800/60 space-y-4">
              {id === "app-flow"       && <AppFlow />}
              {id === "what-is-fl"    && <WhatIsFL />}
              {id === "why-fl-email"  && <WhyFLEmail />}
              {id === "architecture"  && <Architecture />}
              {id === "profiles"      && <Profiles />}
              {id === "features"      && <Features />}
              {id === "fedavg"        && <FedAvg />}
              {id === "fedprox"       && <FedProxSection />}
              {id === "dp"            && <DPSection />}
              {id === "model"         && <ModelArch />}
              {id === "non-iid"       && <NonIID />}
              {id === "training-cfg"  && <TrainingCfg />}
              {id === "metrics"       && <MetricsGuide />}
              {id === "experiments"   && <Experiments />}
              {id === "privacy-table" && <PrivacyTable />}
              {id === "glossary"      && <Glossary />}
            </div>
          )}
        </div>
      ))}
      </div>
    </PageShell>
  );
}

/* ══════════════════════════════════════════════════════════
   SECTION CONTENT
══════════════════════════════════════════════════════════ */

function AppFlow() {
  const steps = [
    {
      n: "1", color: "blue", label: "Create Clients",
      ui: "Clients → Add Client",
      api: "POST /clients",
      detail: "Fill in an ID (slug), display name, spam profile (marketing / balanced / phishing), and email count (50–2000). The controller saves a JSON config and creates fl/data/{id}/ on disk. Each client represents a user with their own private inbox.",
    },
    {
      n: "2", color: "amber", label: "Generate Email Datasets",
      ui: "Clients → Generate Data / Generate All Data",
      api: "POST /data/generate",
      detail: "The controller runs scripts/generate_email_data.py for every configured client. Each client gets a synthetic email CSV with 20 extracted features + a spam label, distributed according to their profile (non-IID). Raw email text is never stored — only the 20 numeric features.",
    },
    {
      n: "3", color: "emerald", label: "Start Federated Training",
      ui: "Training → Start Training",
      api: "POST /training/start",
      detail: "The controller spawns fl/server.py (Flower server on port 8090) then one fl/client.py process per configured client. The dashboard polls GET /training/status every 2 seconds and shows live round progress.",
    },
    {
      n: "4", color: "purple", label: "Flower Training Rounds",
      ui: "Training page — live chart",
      api: "Flower gRPC (internal)",
      detail: "Each round: server sends global weights → each client loads its dataset, trains locally for N epochs, applies DP noise (clip + Gaussian), and submits via gRPC. Server aggregates with FedAvg (or FedProx), writes metrics to fl/output/metrics.json, starts the next round.",
    },
    {
      n: "5", color: "red", label: "Automatic Model Distribution",
      ui: "Training page — status turns 'finished'",
      api: "(background, no UI action needed)",
      detail: "After the final round, the Flower server saves fl/output/global_model.pt. The controller detects the server process has exited and automatically copies the model to fl/data/{id}/model.pt for every client.",
    },
    {
      n: "6", color: "cyan", label: "Inbox Simulation & Classification",
      ui: "Clients → Open Inbox",
      api: "POST /clients/{id}/classify",
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
              {i < steps.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-1 min-h-[24px]" />}
            </div>
            <div className="pb-5">
              <p className="text-sm font-semibold text-zinc-100">{s.label}</p>
              <div className="flex flex-wrap gap-2 mt-1 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">{s.api}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  UI: {s.ui}
                </span>
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

function WhatIsFL() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Federated Learning (FL) is a machine learning paradigm where a model is trained across
        multiple decentralized devices —{" "}
        <span className="text-zinc-200">without sharing raw data</span>. Each participant trains
        on their own private dataset and only sends model weight updates to a central server.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { t: "Privacy",      d: "Raw data never leaves the client. Only weight tensors are transmitted." },
          { t: "Collaboration",d: "Clients improve a shared global model together across many rounds." },
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
        <span className="text-zinc-200">model travels to the data</span> instead of the data
        traveling to the model. This is essential for regulated domains (healthcare, finance,
        private communications) where data cannot leave its origin.
      </p>
    </>
  );
}

function WhyFLEmail() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Email inboxes are among the most private datasets a person owns. Centralising them for spam
        training would expose private communications to a third party. FL solves this directly.
      </p>
      <div className="space-y-3">
        {[
          {
            t: "Each user has unique spam patterns",
            c: "text-blue-400",
            d: "A marketing professional receives a different kind of spam than a developer or a student. A single centralized model trained on pooled data averages out these differences. FL allows the global model to learn from all distributions while each client's local data stays private.",
          },
          {
            t: "Non-IID is natural here",
            c: "text-amber-400",
            d: "This app simulates three distinct spam profiles (marketing, phishing, balanced). Each type has different dominant features (url_count vs caps_ratio vs urgency_words). Without FL, a model trained only on marketing spam would miss phishing patterns — and vice versa.",
          },
          {
            t: "Federation improves all clients",
            c: "text-emerald-400",
            d: "After training, every client receives the same global model that has learned from all profiles. Alice's inbox can now detect phishing-style spam she never saw locally, because Bob's phishing data contributed to training — without Alice ever seeing Bob's emails.",
          },
          {
            t: "Inference is local too",
            c: "text-violet-400",
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

function Architecture() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed mb-2">
        Three independently deployable services communicate over HTTP only — no shared imports, no
        shared database.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { name: "Controller", port: ":8080", color: "text-red-400", border: "border-red-500/20 bg-red-500/5",
            desc: "FastAPI orchestration layer. Manages client configs, spawns Flower subprocesses, serves the classify endpoint." },
          { name: "FL Layer",   port: ":8090", color: "text-blue-400", border: "border-blue-500/20 bg-blue-500/5",
            desc: "Flower server + Flower clients. Handles gRPC-based weight exchange, FedAvg/FedProx aggregation, metrics writing." },
          { name: "Dashboard",  port: ":5173", color: "text-emerald-400", border: "border-emerald-500/20 bg-emerald-500/5",
            desc: "React + Vite UI. Polls the controller API every 2 s during training. Sends all actions as HTTP requests." },
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
          { n:"A", color:"blue",    label:"POST /training/start",         detail:"Dashboard sends config (rounds, epochs, algorithm, DP params). Controller validates that all clients have datasets." },
          { n:"B", color:"amber",   label:"Spawn fl/server.py",           detail:"Controller starts the Flower server subprocess on port 8090 with the given config flags." },
          { n:"C", color:"amber",   label:"Spawn fl/client.py × N",       detail:"Controller spawns one Flower client process per configured client, each pointing at its own dataset CSV." },
          { n:"D", color:"emerald", label:"Flower round (gRPC)",          detail:"Server sends global weights → each client trains locally for local_epochs → applies DP noise → submits weights + metrics via gRPC." },
          { n:"E", color:"purple",  label:"FedAvg aggregation",           detail:"Server computes weighted average of all client weights (weighted by num_samples). Writes round metrics to fl/output/metrics.json." },
          { n:"F", color:"red",     label:"Repeat for all rounds",        detail:"Steps D–E repeat for the configured number of rounds. Dashboard polls /training/status and updates the chart." },
          { n:"G", color:"cyan",    label:"Model distribution",           detail:"After the final round, server saves fl/output/global_model.pt. Controller detects exit and copies the model to fl/data/{id}/model.pt for every client." },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${FLOW_COLORS[s.color]}`}>{s.n}</div>
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
            ["fl/output/metrics.json",   "text-blue-400",    "Written by Flower server after each round; polled by controller"],
            ["fl/output/global_model.pt","text-emerald-400", "Final aggregated model; copied to each client dir on completion"],
            ["fl/data/{id}/dataset.csv", "text-amber-400",   "Per-client training data; written by generate script, read by Flower client"],
            ["fl/data/{id}/model.pt",    "text-violet-400",  "Per-client copy of global model; used by classifier endpoint"],
            ["controller/app/clients/",  "text-red-400",     "JSON config files; read by Flower client spawner + data generator"],
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

function Profiles() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Each client gets a <span className="text-zinc-200">spam profile</span> that controls the
        distribution of email features in their dataset. This creates realistic non-IID data — each
        client sees a fundamentally different slice of the spam problem.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            profile: "marketing", color: "text-amber-400", border: "border-amber-500/20 bg-amber-500/5",
            spam: "70% spam",
            dominant: ["high url_count", "spam_keyword_count", "html_ratio"],
            desc: "Bulk promotional emails — lots of links, discount offers, HTML-heavy layouts. Spam is obvious but not threatening.",
          },
          {
            profile: "phishing", color: "text-red-400", border: "border-red-500/20 bg-red-500/5",
            spam: "70% spam",
            dominant: ["high caps_ratio", "urgency_word_count", "reply_to_mismatch"],
            desc: "Credential harvesting — ALL CAPS, spoofed reply-to addresses, extreme urgency. The most dangerous spam type.",
          },
          {
            profile: "balanced", color: "text-blue-400", border: "border-blue-500/20 bg-blue-500/5",
            spam: "50% spam",
            dominant: ["mixed marketing", "+ phishing features"],
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
        Using three different profiles means FL is genuinely valuable here: a model trained only
        on Alice's marketing spam would score poorly on Bob's phishing emails, and vice versa.
        Federation merges knowledge from all three distributions.
      </p>
    </>
  );
}

function Features() {
  const features = [
    [0,  "word_count",            "Body",    "Total words in email body"],
    [1,  "char_count",            "Body",    "Total characters"],
    [2,  "caps_ratio",            "Body",    "Fraction of uppercase characters — high in phishing"],
    [3,  "exclamation_count",     "Body",    "Number of ! marks — normalized"],
    [4,  "question_count",        "Body",    "Number of ? marks"],
    [5,  "url_count",             "Body",    "Number of URLs/links — hallmark of marketing spam"],
    [6,  "spam_keyword_count",    "Body",    "Occurrences of: free, win, prize, click, offer"],
    [7,  "digit_ratio",           "Body",    "Ratio of digits to total characters"],
    [8,  "special_char_ratio",    "Body",    "$, %, * and other special characters"],
    [9,  "subject_length",        "Subject", "Length of the subject line (normalized)"],
    [10, "subject_caps_ratio",    "Subject", "Uppercase ratio in subject — high in phishing"],
    [11, "subject_spam_keywords", "Subject", "Spam keywords found in the subject line"],
    [12, "has_attachment",        "Header",  "Binary 1 if email has an attachment"],
    [13, "reply_to_mismatch",     "Header",  "1 if sender domain ≠ reply-to domain — phishing indicator"],
    [14, "sender_domain_len",     "Header",  "Length of the sender's domain name (normalized)"],
    [15, "html_ratio",            "Body",    "Fraction of body that is HTML markup — marketing indicator"],
    [16, "urgency_word_count",    "Body",    "Occurrences of: urgent, immediately, limited time"],
    [17, "money_word_count",      "Body",    "Occurrences of: cash, earn, $, €, free money"],
    [18, "personal_greeting",     "Body",    "0 = generic 'dear customer', 1 = named greeting"],
    [19, "line_break_ratio",      "Body",    "Line breaks / total chars — formatting density"],
  ];

  const SOURCE_COLOR: Record<string, string> = {
    Body:    "text-blue-400 bg-blue-500/10",
    Subject: "text-amber-400 bg-amber-500/10",
    Header:  "text-emerald-400 bg-emerald-500/10",
  };

  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Raw email text is <span className="text-zinc-200">never stored or transmitted</span>.
        Instead, the text is converted into 20 numeric features (all normalized 0–1) the moment
        an email arrives. These features are what the ML model actually sees.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700/60">
              <th className="text-left py-2 pr-3 text-zinc-400 font-semibold w-8">#</th>
              <th className="text-left py-2 pr-3 text-zinc-400 font-semibold">Feature</th>
              <th className="text-left py-2 pr-3 text-zinc-400 font-semibold">Source</th>
              <th className="text-left py-2 text-zinc-400 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {features.map(([idx, name, source, desc]) => (
              <tr key={idx as number} className="border-b border-zinc-800/40">
                <td className="py-1.5 pr-3 text-zinc-600 font-mono">{idx as number}</td>
                <td className="py-1.5 pr-3 font-mono text-zinc-200">{name as string}</td>
                <td className="py-1.5 pr-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${SOURCE_COLOR[source as string]}`}>
                    {source as string}
                  </span>
                </td>
                <td className="py-1.5 text-zinc-500">{desc as string}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
        <p className="text-xs text-zinc-400">
          <span className="text-zinc-200 font-semibold">Why normalize to 0–1?</span>{" "}
          Neural networks train poorly on features with very different scales (e.g., word_count can
          be 500 while has_attachment is 0 or 1). Normalization puts all features on the same scale,
          making gradient descent stable.
        </p>
      </div>
    </>
  );
}

function FedAvg() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        The default aggregation strategy is{" "}
        <span className="text-zinc-200">Federated Averaging (FedAvg)</span>, introduced by McMahan
        et al. (2017). Each client's contribution is weighted by its number of training samples:
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-5 font-mono text-center">
        <p className="text-zinc-200 text-sm tracking-wide">
          w<sub className="text-zinc-400 text-xs">global</sub>
          {" = "}
          <span className="text-blue-400">Σ</span>{" "}
          <span className="text-amber-400">(n<sub className="text-xs">i</sub> / n<sub className="text-xs">total</sub>)</span>
          {" × "}
          <span className="text-emerald-400">w<sub className="text-xs">i</sub></span>
        </p>
        <div className="flex justify-center gap-8 mt-4 text-xs text-zinc-500">
          <span><span className="text-amber-400">n<sub>i</sub></span> — samples on client i</span>
          <span><span className="text-amber-400">n<sub>total</sub></span> — total samples</span>
          <span><span className="text-emerald-400">w<sub>i</sub></span> — client i weights</span>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Clients with more data exert proportionally greater influence. A client with 800 samples
        contributes 4× more than one with 200 samples. This handles imbalanced client sizes
        naturally. FedAvg assumes <span className="text-zinc-200">synchronous rounds</span> — the
        server waits for all clients before aggregating.
      </p>
    </>
  );
}

function FedProxSection() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        <span className="text-zinc-200">FedProx</span> extends FedAvg by adding a proximal term
        to each client's local loss. This penalises large deviations from the global model:
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-5 font-mono text-center">
        <p className="text-zinc-200 text-sm tracking-wide">
          <span className="text-blue-400">L</span>
          {" = CrossEntropy(ŷ, y) + "}
          <span className="text-violet-400">(μ / 2)</span>
          {" × ‖"}
          <span className="text-amber-400">w<sub className="text-xs">local</sub></span>
          {" − "}
          <span className="text-emerald-400">w<sub className="text-xs">global</sub></span>
          {"‖²"}
        </p>
      </div>
      <div className="space-y-3">
        {[
          { t: "μ = 0", c: "text-zinc-300",   d: "Reduces FedProx to plain FedAvg." },
          { t: "μ = 0.1", c: "text-violet-400", d: "Recommended starting point. Limits local drift while still allowing meaningful local optimization." },
          { t: "μ = 1.0", c: "text-amber-400",  d: "Strong regularization. Local models barely move from the global weights — good for very heterogeneous systems." },
          { t: "When it helps", c: "text-emerald-400", d: "Partial work (clients that cannot finish all epochs), slow clients, system heterogeneity." },
          { t: "When it does not help", c: "text-red-400", d: "Extreme data heterogeneity. If clients have completely incompatible objectives, the proximal term cannot reconcile them." },
        ].map(({ t, c, d }) => (
          <div key={t} className="flex gap-3">
            <div className={`text-xs font-semibold ${c} w-32 shrink-0 pt-0.5 font-mono`}>{t}</div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function DPSection() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Before submitting weights to the Flower server, each client applies{" "}
        <span className="text-zinc-200">Differential Privacy</span> noise. This limits what any
        observer (including the server) can infer about the individual training samples.
      </p>

      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 font-mono text-xs space-y-1">
        <p className="text-zinc-500"># step 1 — clip L2 norm of each weight tensor</p>
        <p className="text-zinc-300">clipped = w / <span className="text-amber-400">max</span>(1.0, ‖w‖ / clip_norm)</p>
        <p className="text-zinc-500 mt-2"># step 2 — add Gaussian noise</p>
        <p className="text-zinc-300">noised = clipped + <span className="text-blue-400">N</span>(0, noise_mult × clip_norm, shape)</p>
      </div>

      <div className="space-y-3">
        {[
          { t: "clip_norm (default 1.0)",   c: "text-amber-400", d: "L2 clipping threshold. Any weight tensor with norm > clip_norm is scaled down to clip_norm. This bounds the sensitivity — the maximum impact one training sample can have." },
          { t: "noise_mult (default 0.05)", c: "text-blue-400",  d: "Noise standard deviation = noise_mult × clip_norm. Lower = better accuracy, weaker privacy. Higher = stronger privacy, more degradation. A value of 0.05 adds mild noise." },
          { t: "Privacy vs accuracy trade-off", c: "text-purple-400", d: "DP noise makes gradients less informative, which degrades accuracy slightly. With noise_mult=0.05 and 10 rounds the degradation is small. With noise_mult=1.0 the model may fail to converge." },
          { t: "What it prevents", c: "text-emerald-400", d: "Gradient inversion attacks — reconstructing training samples from submitted weights. The added noise makes reconstruction statistically infeasible beyond a privacy budget ε." },
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

function ModelArch() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        The model is a{" "}
        <span className="text-zinc-200">Tabular Multi-Layer Perceptron (TabularMLP)</span> —
        a feed-forward network for structured data classification. Architecture (
        <code className="text-zinc-300 text-xs">fl/shared/model.py</code>):
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 font-mono text-xs space-y-1">
        {[
          ["text-blue-400",    "Input",   "→  [20 features]"],
          ["text-amber-400",   "Linear",  "(20 → 128)  + BatchNorm1d + ReLU + Dropout(0.3)"],
          ["text-amber-400",   "Linear",  "(128 → 64)  + BatchNorm1d + ReLU + Dropout(0.3)"],
          ["text-emerald-400", "Output",  "Linear(64 → 2)  →  logits  →  softmax"],
        ].map(([c, label, rest]) => (
          <p key={label as string}>
            <span className={c as string}>{label as string}</span>
            <span className="text-zinc-400">  {rest as string}</span>
          </p>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          { t: "BatchNorm1d",      d: "Normalises activations per batch. Stabilises training and lets us use higher learning rates." },
          { t: "Dropout(0.3)",     d: "Randomly zeros 30% of neurons during training to prevent overfitting on small local datasets." },
          { t: "CrossEntropyLoss", d: "Multi-class loss. Internally applies log-softmax + NLL in one numerically stable operation." },
          { t: "Adam optimizer",   d: "Adaptive per-parameter learning rate. Converges faster than SGD on tabular data." },
        ].map(({ t, d }) => (
          <div key={t} className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
            <p className="font-semibold text-zinc-200 mb-1 font-mono text-xs">{t}</p>
            <p className="text-zinc-500 text-xs">{d}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        <span className="text-zinc-300">input_dim = 20</span> (must match FEATURE_NAMES length in
        fl/shared/features.py) &nbsp;·&nbsp;
        <span className="text-zinc-300">num_classes = 2</span> (0 = ham, 1 = spam)
      </p>
    </>
  );
}

function NonIID() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        In real FL each client's data is{" "}
        <span className="text-zinc-200">
          not independently and identically distributed (non-IID)
        </span>
        . This is the central challenge — local models trained on skewed data diverge, making
        aggregation less effective.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-emerald-400 mb-1">IID (ideal)</p>
          <p className="text-xs text-zinc-500">
            Each client is a random sample of the global distribution. FedAvg converges fast and reliably.
          </p>
        </div>
        <div className="bg-zinc-800/60 border border-red-500/10 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Non-IID (reality)</p>
          <p className="text-xs text-zinc-500">
            Each client has skewed distributions. Local models develop different gradients, slowing or destabilising global convergence.
          </p>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        In this app non-IID is simulated through spam profiles: the marketing client has 70% spam
        dominated by url_count and keywords, while the phishing client has 70% spam dominated by
        caps_ratio and urgency_words. You can see the effect in the Training metrics — early rounds
        often oscillate as profiles pull the global model in different directions before converging.
      </p>
      <div className="space-y-2">
        {[
          { t: "FedProx",  d: "Adds a proximal term to pull local models back toward the global model, reducing drift." },
          { t: "SCAFFOLD", d: "Control variates that correct the local gradient direction. More expensive but more stable under extreme non-IID." },
          { t: "FedNova",  d: "Normalises local updates by the number of steps taken, compensating for heterogeneous local epochs." },
          { t: "Data quantity", d: "The simplest fix: a balanced client (50/50 profile) in the federation acts as an anchor that stabilises aggregation." },
        ].map(({ t, d }) => (
          <div key={t} className="flex gap-3">
            <div className="text-xs font-semibold text-violet-400 w-28 shrink-0 pt-0.5 font-mono">{t}</div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function TrainingCfg() {
  const params = [
    { p: "rounds",        default: "10",    range: "1–100",      desc: "Number of complete FL rounds. Each round = distribute → train → aggregate. More rounds = better model up to convergence." },
    { p: "local_epochs",  default: "5",     range: "1–50",       desc: "How many epochs each client trains locally per round before submitting. More epochs = more local specialisation (can hurt non-IID convergence)." },
    { p: "learning_rate", default: "0.01",  range: "0.0001–1",   desc: "Adam learning rate for local training. 0.01 is a good starting point. Too high = unstable. Too low = slow convergence." },
    { p: "algorithm",     default: "fedavg",range: "fedavg / fedprox", desc: "FedAvg: weighted average. FedProx: weighted average + proximal regularisation. Use FedProx when you have very non-IID profiles or partial participation." },
    { p: "mu",            default: "0.1",   range: "0–1",        desc: "FedProx proximal term strength. Only used when algorithm = fedprox. μ = 0 reduces to FedAvg." },
    { p: "clip_norm",     default: "1.0",   range: "0.1–10",     desc: "DP clipping threshold. Lower = stronger privacy, more noise impact. 1.0 is a reasonable default." },
    { p: "noise_mult",    default: "0.05",  range: "0–1",        desc: "DP noise multiplier. σ = noise_mult × clip_norm. 0.05 adds mild noise with minimal accuracy impact. Set to 0 to disable DP." },
    { p: "min_clients",   default: "2",     range: "1–N",        desc: "Minimum clients required per round. Training won't start until this many are connected. Must be ≤ number of configured clients." },
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

function MetricsGuide() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Metrics are computed by each Flower client on their held-out test split (20% of dataset)
        after each local training phase, then averaged across all clients by the server weighted
        by sample count. Written to{" "}
        <code className="text-zinc-300 text-xs">fl/output/metrics.json</code> after each round.
      </p>
      <div className="space-y-3">
        {[
          { t: "avg_loss (↓ better)",        d: "Cross-entropy loss averaged across all clients. Measures model confidence and correctness. Should decrease over rounds." },
          { t: "avg_accuracy (↑ better)",    d: "Fraction of test emails correctly classified. Increases as the global model improves. Expect 70–85% on these profiles after 10 rounds." },
          { t: "spam_rate",                  d: "Fraction of test emails predicted as spam. A useful sanity check — should roughly match the client's profile spam ratio." },
          { t: "Round history table",        d: "Shows every round in reverse order: loss, accuracy, participating clients, timestamp. Use this to identify rounds with unusual behaviour." },
          { t: "Convergence chart",          d: "Loss (red) and accuracy (green) over rounds. Well-converging runs show monotonically improving curves. Oscillating curves indicate non-IID conflict or learning rate too high." },
          { t: "Per-client breakdown",       d: "Each RoundMetric includes a clients dict with per-client loss, accuracy, spam_rate, num_samples. Useful for diagnosing which client is lagging." },
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

function PrivacyTable() {
  const rows = [
    { data: "Raw email text",           location: "Client only (fl/data/{id}/)",  shared: false, note: "Never transmitted anywhere" },
    { data: "Extracted features",       location: "Client only",                   shared: false, note: "Never leaves the client process" },
    { data: "Model weights (pre-noise)",location: "Client only",                   shared: false, note: "Discarded after DP noise is applied" },
    { data: "Model weights (post-DP)",  location: "Client → Flower server",        shared: true,  note: "Transmitted via gRPC — DP-noised" },
    { data: "Global model weights",     location: "Server → all clients",          shared: true,  note: "Written to fl/output/ and distributed" },
    { data: "Aggregate metrics",        location: "Server → controller → dashboard",shared: true, note: "Only averages — no individual-level data" },
    { data: "Client config (profile, count)", location: "Controller",             shared: true,  note: "Not sensitive — no email content" },
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

function Experiments() {
  const rows = [
    { algo: "FedAvg",        lr: "0.01",  profiles: "all three",  rounds: 10, acc: "~80%", osc: "±5%",  note: "Good baseline" },
    { algo: "FedAvg",        lr: "0.01",  profiles: "2 phishing", rounds: 10, acc: "~75%", osc: "±11%", note: "Phishing drift" },
    { algo: "FedProx μ=0.1", lr: "0.01",  profiles: "all three",  rounds: 10, acc: "~78%", osc: "±4%",  note: "More stable" },
    { algo: "FedAvg",        lr: "0.001", profiles: "all three",  rounds: 10, acc: "~65%", osc: "±3%",  note: "Underfit" },
    { algo: "FedAvg",        lr: "0.01",  profiles: "all three",  rounds: 20, acc: "~84%", osc: "±3%",  note: "Best overall" },
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

function Glossary() {
  const terms = [
    ["FedAvg",         "Federated Averaging — weighted mean of client weights by sample count."],
    ["FedProx",        "Extension of FedAvg with a proximal term limiting local model drift."],
    ["Round",          "One complete cycle: distribute weights → local train → collect → aggregate."],
    ["IID",            "Independent and Identically Distributed — each client is a fair sample of the global distribution."],
    ["Non-IID",        "Data distribution varies per client. More realistic but harder to converge."],
    ["Global model",   "The shared model weights on the server, updated each round via FedAvg."],
    ["Local epochs",   "Training iterations a client runs on its own data before submitting weights."],
    ["Aggregation",    "Combining client weight updates into a new global model."],
    ["DP",             "Differential Privacy — adding calibrated noise to bound information leakage about individuals."],
    ["clip_norm",      "L2 norm clipping threshold. Bounds the sensitivity of each weight tensor."],
    ["noise_mult",     "DP noise multiplier. σ = noise_mult × clip_norm added to each clipped weight."],
    ["Spam profile",   "Per-client configuration that determines the distribution of spam types in the synthetic dataset."],
    ["Feature vector", "20 normalized numeric values extracted from an email, used as model input instead of raw text."],
    ["Gradient inversion", "Attack where an adversary reconstructs training data from submitted weight updates."],
    ["Straggler",      "A client that is significantly slower than others, delaying the round."],
    ["metrics.json",   "JSON file written by the Flower server after each round; polled by the controller to serve training status."],
    ["global_model.pt","PyTorch state dict saved after the final training round; distributed to all client data directories."],
    ["Flower (flwr)",  "Open-source federated learning framework. Handles gRPC communication between server and clients."],
    ["gRPC",           "Google Remote Procedure Call — binary protocol used internally by Flower for weight exchange."],
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

/* ── Shared helpers ───────────────────────────────────────── */

const FLOW_COLORS: Record<string, string> = {
  blue:   "bg-blue-500/20   text-blue-400   border-blue-500/30",
  amber:  "bg-amber-500/20  text-amber-400  border-amber-500/30",
  emerald:"bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  red:    "bg-red-500/20    text-red-400    border-red-500/30",
  cyan:   "bg-cyan-500/20   text-cyan-400   border-cyan-500/30",
};

