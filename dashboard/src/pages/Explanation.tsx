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
  FlaskConical,
  BarChart2,
} from "lucide-react";

/* ── Section data ────────────────────────────────────────── */

const SECTIONS = [
  {
    id: "what-is-fl",
    icon: Shield,
    color: "text-blue-400",
    title: "What is Federated Learning?",
    content: <WhatIsFL />,
  },
  {
    id: "fedavg",
    icon: GitMerge,
    color: "text-emerald-400",
    title: "FedAvg Algorithm",
    content: <FedAvg />,
  },
  {
    id: "fedprox",
    icon: GitMerge,
    color: "text-violet-400",
    title: "FedProx — Proximal Term Algorithm",
    content: <FedProxSection />,
  },
  {
    id: "non-iid",
    icon: Shuffle,
    color: "text-amber-400",
    title: "Non-IID Data & the Heterogeneity Problem",
    content: <NonIID />,
  },
  {
    id: "privacy",
    icon: Lock,
    color: "text-purple-400",
    title: "Privacy in Federated Learning",
    content: <Privacy />,
  },
  {
    id: "architecture",
    icon: Server,
    color: "text-red-400",
    title: "System Architecture",
    content: <Architecture />,
  },
  {
    id: "model",
    icon: Cpu,
    color: "text-cyan-400",
    title: "Model Architecture — TabularMLP",
    content: <ModelArch />,
  },
  {
    id: "challenges",
    icon: FlaskConical,
    color: "text-orange-400",
    title: "Real-World FL Challenges",
    content: <Challenges />,
  },
  {
    id: "metrics",
    icon: BarChart2,
    color: "text-pink-400",
    title: "Reading the Metrics",
    content: <MetricsGuide />,
  },
  {
    id: "experiments",
    icon: BarChart2,
    color: "text-pink-400",
    title: "Experiment Results",
    content: <Experiments />,
  },
  {
    id: "glossary",
    icon: Database,
    color: "text-zinc-400",
    title: "Glossary",
    content: <Glossary />,
  },
];

/* ── Page ────────────────────────────────────────────────── */

export default function Explanation() {
  const [open, setOpen] = useState<string | null>("what-is-fl");

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">How It Works</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Core concepts behind federated learning
        </p>
      </div>

      {SECTIONS.map(({ id, icon: Icon, color, title, content }) => (
        <div
          key={id}
          className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
            onClick={() => setOpen(open === id ? null : id)}>
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
              {content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Section content ─────────────────────────────────────── */

function WhatIsFL() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Federated Learning (FL) is a machine learning paradigm where a model is
        trained across multiple decentralized devices —{" "}
        <span className="text-zinc-200">without sharing raw data</span>. Each
        participant trains on their own private dataset and only sends model
        weight updates to a central server.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            t: "Privacy",
            d: "Raw data never leaves the client. Only weight tensors are transmitted.",
          },
          {
            t: "Collaboration",
            d: "Clients improve a shared global model together across many rounds.",
          },
          {
            t: "Scale",
            d: "Works across thousands of devices in parallel with no shared storage.",
          },
        ].map(({ t, d }) => (
          <div
            key={t}
            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-zinc-200 mb-1">{t}</p>
            <p className="text-xs text-zinc-500">{d}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Classical centralized ML collects all data on one server. FL inverts
        this: the model travels to the data instead of the data traveling to the
        model. This makes FL essential for regulated industries (healthcare,
        finance) where data cannot leave its origin.
      </p>
    </>
  );
}

function FedAvg() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        The aggregation strategy used is{" "}
        <span className="text-zinc-200">Federated Averaging (FedAvg)</span>,
        introduced by McMahan et al. (2017). Each client's contribution is
        weighted by the number of training samples it used:
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-5 font-mono text-center">
        <p className="text-zinc-200 text-sm tracking-wide">
          w<sub className="text-zinc-400 text-xs">global</sub>
          {" = "}
          <span className="text-blue-400">Σ</span>{" "}
          <span className="text-amber-400">
            (n<sub className="text-xs">i</sub> / n
            <sub className="text-xs">total</sub>)
          </span>
          {" × "}
          <span className="text-emerald-400">
            w<sub className="text-xs">i</sub>
          </span>
        </p>
        <div className="flex justify-center gap-8 mt-4 text-xs text-zinc-500">
          <span>
            <span className="text-amber-400 font-semibold">
              n<sub>i</sub>
            </span>{" "}
            — samples on client i
          </span>
          <span>
            <span className="text-amber-400 font-semibold">
              n<sub>total</sub>
            </span>{" "}
            — total samples
          </span>
          <span>
            <span className="text-emerald-400 font-semibold">
              w<sub>i</sub>
            </span>{" "}
            — client i weights
          </span>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Clients with more data exert proportionally greater influence. A client
        with 800 samples contributes 4× more than a client with 200 samples.
        This naturally handles imbalanced data distributions without special
        tuning.
      </p>
      <p className="text-sm text-zinc-400 leading-relaxed">
        FedAvg assumes{" "}
        <span className="text-zinc-200">synchronous aggregation</span> — the
        server waits for all registered clients before computing the average.
        This is the simplest correct implementation but is sensitive to
        stragglers (slow or disconnected clients).
      </p>
    </>
  );
}

function NonIID() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        In real-world FL, each client's local data is{" "}
        <span className="text-zinc-200">
          not independently and identically distributed (non-IID)
        </span>
        . One hospital only sees cancer patients; one phone user only speaks
        French. This data heterogeneity is the central challenge of federated
        learning.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-emerald-400 mb-1">
            IID (ideal)
          </p>
          <p className="text-xs text-zinc-500">
            Each client is a random sample of the global distribution. FedAvg
            converges fast and reliably.
          </p>
        </div>
        <div className="bg-zinc-800/60 border border-red-500/10 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">
            Non-IID (reality)
          </p>
          <p className="text-xs text-zinc-500">
            Each client has skewed class distributions. Local models diverge
            heavily, slowing or destabilising global convergence.
          </p>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        This project simulates non-IID by{" "}
        <span className="text-zinc-200">
          sorting samples by label before splitting
        </span>
        . Client 1 gets mostly class-0 samples, client 2 mostly class-1, etc.
        You can observe the effect: client models start from very different
        local optima, and the aggregated model slowly finds a middle ground.
      </p>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Advanced FL algorithms like{" "}
        <span className="text-zinc-200">FedProx</span> and{" "}
        <span className="text-zinc-200">SCAFFOLD</span> add correction terms to
        stabilise convergence under non-IID conditions. FedAvg used here is the
        baseline.
      </p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        FL improves privacy by keeping raw data local. Only gradient updates
        (weight tensors) leave the device. However, this alone does{" "}
        <span className="text-zinc-200">not guarantee full privacy</span>.
      </p>
      <div className="space-y-3">
        {[
          {
            title: "Gradient inversion attacks",
            color: "text-red-400",
            desc: "An adversarial server can reconstruct training samples from submitted gradients. Research has demonstrated pixel-perfect image reconstruction from a single gradient update.",
          },
          {
            title: "Membership inference",
            color: "text-orange-400",
            desc: "An attacker can determine whether a specific record was in a client's training set by querying the model output distribution.",
          },
          {
            title: "Differential Privacy (DP)",
            color: "text-emerald-400",
            desc: "The standard defence: add calibrated Gaussian noise to gradients before submission. This provably limits what any observer can infer about individual training samples, at the cost of some accuracy.",
          },
          {
            title: "Secure Aggregation",
            color: "text-blue-400",
            desc: "Cryptographic protocol where the server only sees the sum of client weights, never individual updates. Prevents even the server from inverting a single client's gradient.",
          },
        ].map(({ title, color, desc }) => (
          <div key={title} className="flex gap-3">
            <div
              className={`text-xs font-semibold ${color} w-44 shrink-0 pt-0.5`}>
              {title}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Architecture() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed mb-4">
        This system uses a{" "}
        <span className="text-zinc-200">synchronous star topology</span>: one
        central server coordinates N clients per round over plain HTTP/REST.
      </p>
      <div className="flex flex-col gap-2">
        {[
          {
            n: "1",
            color: "blue",
            l: "POST /start",
            d: "Dashboard sends config: input_dim, num_classes, rounds, epochs, lr. Server initialises the global model.",
          },
          {
            n: "2",
            color: "amber",
            l: "POST /register",
            d: "Each client announces itself. Server records the client ID and waits for training to open.",
          },
          {
            n: "3",
            color: "emerald",
            l: "GET /weights",
            d: "Clients download current global weights as flattened JSON arrays + shape metadata.",
          },
          {
            n: "4",
            color: "purple",
            l: "Local training",
            d: "Each client runs N epochs on its private dataset using the hyperparameters fetched from GET /training-config.",
          },
          {
            n: "5",
            color: "red",
            l: "POST /submit",
            d: "Client uploads updated weights + num_samples + local loss/accuracy. Server stores the submission.",
          },
          {
            n: "6",
            color: "blue",
            l: "FedAvg",
            d: "Once all clients submit, server computes the weighted average and saves a checkpoint to output/.",
          },
        ].map(({ n, color, l, d }, i, arr) => (
          <FlowStep
            key={n}
            n={n}
            color={color}
            label={l}
            detail={d}
            last={i === arr.length - 1}
          />
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
        <span className="text-zinc-200">
          Tabular Multi-Layer Perceptron (TabularMLP)
        </span>
        — a feed-forward neural network suitable for structured/tabular
        classification tasks.
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 font-mono text-xs space-y-1 text-zinc-400">
        <p>
          <span className="text-blue-400">Input</span> → [input_dim]
        </p>
        <p>
          <span className="text-amber-400">Linear</span>(input_dim → 128) +
          BatchNorm + ReLU + Dropout(0.3)
        </p>
        <p>
          <span className="text-amber-400">Linear</span>(128 → 64) + BatchNorm +
          ReLU + Dropout(0.3)
        </p>
        <p>
          <span className="text-amber-400">Linear</span>(64 → 32) + ReLU
        </p>
        <p>
          <span className="text-emerald-400">Output</span> → Linear(32 →
          num_classes) → logits
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        {[
          {
            t: "BatchNorm",
            d: "Normalises layer inputs per batch, stabilising training and allowing higher learning rates.",
          },
          {
            t: "Dropout(0.3)",
            d: "Randomly zeroes 30% of neurons during training to prevent overfitting on small local datasets.",
          },
          {
            t: "CrossEntropyLoss",
            d: "Standard multi-class loss. Combines log-softmax and NLL loss in one stable operation.",
          },
          {
            t: "Adam optimizer",
            d: "Adaptive learning rate per parameter. Converges faster than plain SGD on tabular data.",
          },
        ].map(({ t, d }) => (
          <div
            key={t}
            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
            <p className="font-semibold text-zinc-200 mb-1 font-mono">{t}</p>
            <p className="text-zinc-500">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Challenges() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Real federated deployments face challenges that the Kick feature in this
        dashboard lets you simulate:
      </p>
      <div className="space-y-3">
        {[
          {
            t: "Client dropout",
            c: "text-red-400",
            d: "A device loses connectivity mid-round. With synchronous FL the server blocks forever waiting for its submission — or must skip it after a timeout.",
          },
          {
            t: "Stragglers",
            c: "text-orange-400",
            d: "Some clients train much slower (low-end hardware, large datasets). The global round is only as fast as the slowest participant.",
          },
          {
            t: "Data poisoning",
            c: "text-purple-400",
            d: "A malicious client submits manipulated weights designed to degrade the global model or introduce backdoors.",
          },
          {
            t: "System heterogeneity",
            c: "text-amber-400",
            d: "Clients have different hardware, RAM, and battery constraints. A uniform local_epochs setting may be too expensive for weaker devices.",
          },
          {
            t: "Communication cost",
            c: "text-blue-400",
            d: "Transmitting full model weights every round is expensive on mobile networks. Techniques like gradient compression and quantisation reduce bandwidth by 10–100×.",
          },
        ].map(({ t, c, d }) => (
          <div key={t} className="flex gap-3">
            <div className={`text-xs font-semibold ${c} w-40 shrink-0 pt-0.5`}>
              {t}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
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
        The metrics are reported by clients as part of their{" "}
        <span className="text-zinc-200">POST /submit</span> payload after local
        training. Loss and accuracy reflect the{" "}
        <span className="text-zinc-200">locally fine-tuned model</span>{" "}
        evaluated on each client's held-out test split, then averaged across all
        clients by the server.
      </p>
      <div className="space-y-3">
        {[
          {
            t: "Loss (↓ better)",
            d: "CrossEntropyLoss on the test split. Measures how confident and correct the model is. Ideally decreases each round.",
          },
          {
            t: "Accuracy (↑ better)",
            d: "Fraction of test samples correctly classified. Rises as the global model improves.",
          },
          {
            t: "Loss delta",
            d: "Change in loss vs the previous round. Negative (green) = improving. Positive (red) = degrading — normal if a client was kicked or data is very non-IID.",
          },
          {
            t: "Acc delta",
            d: "Change in accuracy vs the previous round. Positive (green) = improving.",
          },
          {
            t: "Accuracy gain chart",
            d: "Bar chart of per-round accuracy improvement. Tall bars early = fast learning. Flat bars later = convergence or saturation near the noise floor.",
          },
          {
            t: "Early stopping",
            d: "The server monitors loss across the last 10 rounds. If neither loss nor accuracy improves meaningfully (loss trend flat, accuracy gain < 2%), training stops automatically. Prevents wasted compute on runs that have already converged.",
          },
        ].map(({ t, d }) => (
          <div key={t} className="flex gap-3">
            <div className="text-xs font-semibold text-zinc-300 w-40 shrink-0 pt-0.5 font-mono">
              {t}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function FedProxSection() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        <span className="text-zinc-200">FedProx</span> extends FedAvg by adding
        a proximal term to each client's loss function that penalises large
        deviations from the global model:
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-5 font-mono text-center">
        <p className="text-zinc-200 text-sm tracking-wide">
          <span className="text-blue-400">L</span>
          {" = CrossEntropy(output, labels) + "}
          <span className="text-violet-400">(μ / 2)</span>
          {" × ‖"}
          <span className="text-amber-400">
            w<sub className="text-xs">local</sub>
          </span>
          {" − "}
          <span className="text-emerald-400">
            w<sub className="text-xs">global</sub>
          </span>
          {"‖²"}
        </p>
      </div>
      <div className="space-y-3">
        {[
          {
            t: "What μ controls",
            c: "text-violet-400",
            d: "μ = 0 reduces FedProx to plain FedAvg. Higher μ (0.1, 1.0) pulls local models closer to the global model each round, limiting drift.",
          },
          {
            t: "When it helps",
            c: "text-emerald-400",
            d: "System heterogeneity, partial work (clients that can't complete all epochs), and slow clients. The proximal term makes partial updates safe to aggregate.",
          },
          {
            t: "When it does NOT help",
            c: "text-red-400",
            d: "Extreme data heterogeneity — our finding. With 90/10 label skew the proximal term cannot overcome the fundamental conflict between client objectives.",
          },
          {
            t: "Typical μ values",
            c: "text-zinc-300",
            d: "0.01, 0.1, 1.0. Start with μ = 0.1. Higher values improve stability but slow convergence speed.",
          },
        ].map(({ t, c, d }) => (
          <div key={t} className="flex gap-3">
            <div className={`text-xs font-semibold ${c} w-44 shrink-0 pt-0.5`}>
              {t}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Experiments() {
  const rows = [
    { algo: "FedAvg",          lr: "0.01",  skew: "Extreme 90/10", acc: "78.07%", osc: "±11%" },
    { algo: "FedAvg",          lr: "0.001", skew: "Extreme 90/10", acc: "64.39%", osc: "±3%"  },
    { algo: "FedAvg",          lr: "0.005", skew: "Extreme 90/10", acc: "78.16%", osc: "±13%" },
    { algo: "FedProx μ=0.1",   lr: "0.01",  skew: "Extreme 90/10", acc: "76.32%", osc: "±12%" },
    { algo: "FedAvg ✅",        lr: "0.01",  skew: "Moderate 70/30", acc: "77.50%", osc: "±3%"  },
    { algo: "FedProx μ=0.1",   lr: "0.01",  skew: "Moderate 70/30", acc: "74.17%", osc: "±4%"  },
  ];
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700/60">
              {["Algorithm", "LR", "Data Skew", "Best Acc", "Oscillation"].map((h) => (
                <th key={h} className="text-left py-2 pr-4 text-zinc-400 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-zinc-800/40">
                <td className="py-2 pr-4 font-mono text-zinc-200">{r.algo}</td>
                <td className="py-2 pr-4 text-zinc-400">{r.lr}</td>
                <td className="py-2 pr-4 text-zinc-400">{r.skew}</td>
                <td className="py-2 pr-4 text-emerald-400 font-semibold">{r.acc}</td>
                <td className="py-2 text-amber-400">{r.osc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-4">
        <p className="text-xs text-zinc-300 font-semibold mb-1">Key finding</p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Data distribution matters more than algorithm choice. Reducing skew
          from 90/10 to 70/30 improved oscillation from ±11% to ±3% — more
          than any algorithm or learning rate change.
        </p>
      </div>
    </>
  );
}

function Glossary() {
  const terms = [
    [
      "FedAvg",
      "Federated Averaging — weighted mean of client weights by sample count.",
    ],
    [
      "Round",
      "One complete cycle: distribute → train locally → collect → aggregate.",
    ],
    [
      "IID",
      "Independent and Identically Distributed. Each client is a fair sample of the global distribution.",
    ],
    [
      "Non-IID",
      "Data distribution varies per client. More realistic but harder to converge.",
    ],
    [
      "Global model",
      "The shared model on the server, updated each round via FedAvg.",
    ],
    [
      "Local epochs",
      "Number of training iterations a client runs on its own data before submitting.",
    ],
    ["Aggregation", "Combining client weight updates into a new global model."],
    [
      "Checkpoint",
      "Snapshot of global model weights saved to output/ after each round.",
    ],
    [
      "Differential Privacy",
      "Adding calibrated noise to gradients to bound information leakage about individual records.",
    ],
    [
      "Secure Aggregation",
      "Cryptographic protocol ensuring the server only sees summed weights, never individual client updates.",
    ],
    [
      "Straggler",
      "A client that is significantly slower than others, delaying the round.",
    ],
    [
      "Dropout",
      "A client that disconnects mid-round and never submits. Distinct from the neural-network regularisation technique of the same name.",
    ],
    [
      "FedProx",
      "Extension of FedAvg that adds a proximal term to constrain how far local models drift from the global model — better for non-IID data.",
    ],
    [
      "FLStatus",
      "The JSON payload returned by GET /status describing current server state, round, clients, and metrics.",
    ],
  ];
  return (
    <dl className="space-y-2.5">
      {terms.map(([term, def]) => (
        <div key={term} className="grid grid-cols-[180px_1fr] gap-3 text-sm">
          <dt className="font-mono text-blue-400 font-medium text-xs pt-0.5">
            {term}
          </dt>
          <dd className="text-zinc-400 text-xs leading-relaxed">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Shared sub-components ───────────────────────────────── */

const FLOW_COLORS: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
};

function FlowStep({
  n,
  color,
  label,
  detail,
  last = false,
}: {
  n: string;
  color: string;
  label: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${FLOW_COLORS[color]}`}>
          {n}
        </div>
        {!last && <div className="w-px flex-1 bg-zinc-800 my-1" />}
      </div>
      <div className="pb-3">
        <p className="text-sm font-medium text-zinc-200 font-mono">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
