import { Shield, Users, Server, ArrowRight, GitMerge, Database, Lock, Shuffle } from "lucide-react";

export default function Explanation() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">How It Works</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Federated Learning — concepts, architecture, and algorithms</p>
      </div>

      {/* What is FL */}
      <Section
        icon={<Shield size={18} className="text-blue-400" />}
        title="What is Federated Learning?"
      >
        <p className="text-sm text-zinc-400 leading-relaxed">
          Federated Learning (FL) is a machine learning paradigm where a model is trained across
          multiple decentralized devices or servers — <span className="text-zinc-200">without sharing
          raw data</span>. Each client trains on its own local dataset and only sends model weight
          updates to a central server. This preserves data privacy while still enabling collaborative
          model improvement.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: "Privacy", desc: "Raw data never leaves the client device." },
            { title: "Decentralization", desc: "Training runs in parallel across all clients." },
            { title: "Collaboration", desc: "Clients improve a shared global model together." },
          ].map((item) => (
            <div key={item.title} className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-zinc-200 mb-1">{item.title}</p>
              <p className="text-xs text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Architecture */}
      <Section
        icon={<Server size={18} className="text-amber-400" />}
        title="System Architecture"
      >
        <p className="text-sm text-zinc-400 leading-relaxed mb-5">
          This system follows a <span className="text-zinc-200">synchronous star topology</span>: one
          central server coordinates N clients per round. All communication happens over HTTP/REST —
          no persistent connections required.
        </p>

        {/* Flow diagram */}
        <div className="flex flex-col gap-2">
          <FlowStep
            n="1"
            color="blue"
            label="Server broadcasts global weights"
            detail="Clients call GET /weights to download the current global model parameters."
          />
          <FlowStep
            n="2"
            color="amber"
            label="Clients train locally"
            detail="Each client runs multiple epochs on its private dataset and computes updated weights."
          />
          <FlowStep
            n="3"
            color="emerald"
            label="Clients submit updates"
            detail="Clients POST /submit with their weight tensors and the number of local samples used."
          />
          <FlowStep
            n="4"
            color="purple"
            label="Server aggregates (FedAvg)"
            detail="Once all expected submissions arrive, the server computes a weighted average of all weight tensors."
          />
          <FlowStep
            n="5"
            color="blue"
            label="Next round begins"
            detail="The aggregated model becomes the new global model. The server opens the next round."
            last
          />
        </div>
      </Section>

      {/* FedAvg */}
      <Section
        icon={<GitMerge size={18} className="text-emerald-400" />}
        title="FedAvg Algorithm"
      >
        <p className="text-sm text-zinc-400 leading-relaxed">
          The aggregation strategy used is <span className="text-zinc-200">Federated Averaging
          (FedAvg)</span>, introduced by McMahan et al. (2017). Each client's contribution is
          weighted proportionally by the number of samples it trained on:
        </p>

        {/* Formula */}
        <div className="mt-4 bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-5 font-mono text-center">
          <p className="text-zinc-200 text-sm tracking-wide">
            w<sub className="text-zinc-400 text-xs">global</sub>
            {" = "}
            <span className="text-blue-400">Σ</span>
            {" "}
            <span className="text-amber-400">(n<sub className="text-xs">i</sub> / n<sub className="text-xs">total</sub>)</span>
            {" × "}
            <span className="text-emerald-400">w<sub className="text-xs">i</sub></span>
          </p>
          <div className="flex justify-center gap-8 mt-4 text-xs text-zinc-500">
            <span><span className="text-amber-400 font-semibold">n<sub>i</sub></span> — samples on client i</span>
            <span><span className="text-amber-400 font-semibold">n<sub>total</sub></span> — total samples</span>
            <span><span className="text-emerald-400 font-semibold">w<sub>i</sub></span> — client i weights</span>
          </div>
        </div>

        <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
          Clients with more data exert proportionally greater influence on the global model.
          This naturally handles imbalanced client datasets without any special configuration.
        </p>
      </Section>

      {/* Key concepts */}
      <Section
        icon={<Database size={18} className="text-purple-400" />}
        title="Key Concepts"
      >
        <div className="space-y-4">
          <Concept
            icon={<Shuffle size={14} className="text-amber-400 shrink-0 mt-0.5" />}
            title="Non-IID Data"
          >
            In real-world federated settings, each client's data is{" "}
            <span className="text-zinc-200">not independently and identically distributed
            (non-IID)</span>. For example, one hospital may only have data for certain diseases.
            This project simulates non-IID conditions by sorting samples by class label before
            splitting across clients — so client 1 gets mostly class-0 samples, client 2 mostly
            class-1, and so on.
          </Concept>

          <Concept
            icon={<Lock size={14} className="text-emerald-400 shrink-0 mt-0.5" />}
            title="Privacy Preservation"
          >
            Only <span className="text-zinc-200">model gradients / weight tensors</span> are
            transmitted — never the underlying data. This alone does not guarantee full privacy
            (gradient inversion attacks exist), but it provides a practical first layer of data
            protection suitable for many regulated environments.
          </Concept>

          <Concept
            icon={<Users size={14} className="text-blue-400 shrink-0 mt-0.5" />}
            title="Synchronous vs Asynchronous FL"
          >
            This implementation is <span className="text-zinc-200">synchronous</span>: the server
            waits for <em>all</em> registered clients to submit before aggregating. Asynchronous FL
            aggregates as soon as a minimum quorum submits, which tolerates stragglers but can
            introduce staleness bias.
          </Concept>
        </div>
      </Section>

      {/* State machine */}
      <Section
        icon={<ArrowRight size={18} className="text-red-400" />}
        title="Server State Machine"
      >
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          The server transitions through four states per training session:
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {(["waiting", "round_open", "aggregating", "finished"] as const).map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <StatePill state={s} />
              {i < arr.length - 1 && <ArrowRight size={12} className="text-zinc-600" />}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm text-zinc-400">
          <StateDesc state="waiting">
            Server is idle. Clients can register. Training starts when POST /start is called.
          </StateDesc>
          <StateDesc state="round_open">
            Clients fetch weights and submit updates. Server waits for all submissions.
          </StateDesc>
          <StateDesc state="aggregating">
            All submissions received. FedAvg is running. Model checkpoint is being saved.
          </StateDesc>
          <StateDesc state="finished">
            All rounds complete. Final model is saved to the output/ directory.
          </StateDesc>
        </div>
      </Section>

      {/* Glossary */}
      <Section
        icon={<Database size={18} className="text-zinc-400" />}
        title="Glossary"
      >
        <dl className="space-y-3">
          {GLOSSARY.map(({ term, def }) => (
            <div key={term} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
              <dt className="font-mono text-blue-400 font-medium">{term}</dt>
              <dd className="text-zinc-400">{def}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FlowStep({ n, color, label, detail, last = false }: {
  n: string; color: string; label: string; detail: string; last?: boolean;
}) {
  const colors: Record<string, string> = {
    blue:    "bg-blue-500/20 text-blue-400 border-blue-500/30",
    amber:   "bg-amber-500/20 text-amber-400 border-amber-500/30",
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    purple:  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${colors[color]}`}>
          {n}
        </div>
        {!last && <div className="w-px flex-1 bg-zinc-800 mt-1 mb-0" />}
      </div>
      <div className={`pb-4 ${last ? "" : ""}`}>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function Concept({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      {icon}
      <div>
        <p className="text-sm font-semibold text-zinc-200 mb-1">{title}</p>
        <p className="text-sm text-zinc-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

const STATE_STYLES: Record<string, string> = {
  waiting:     "bg-zinc-700/50 text-zinc-400",
  round_open:  "bg-blue-500/20 text-blue-400",
  aggregating: "bg-amber-500/20 text-amber-400",
  finished:    "bg-emerald-500/20 text-emerald-400",
};

function StatePill({ state }: { state: keyof typeof STATE_STYLES }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium ${STATE_STYLES[state]}`}>
      {state}
    </span>
  );
}

function StateDesc({ state, children }: {
  state: keyof typeof STATE_STYLES; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <StatePill state={state} />
      <p className="text-xs text-zinc-500 leading-relaxed">{children}</p>
    </div>
  );
}

const GLOSSARY = [
  { term: "FedAvg",      def: "Federated Averaging — weighted mean of client weights by sample count." },
  { term: "Round",       def: "One complete cycle: distribute → train locally → collect → aggregate." },
  { term: "IID",         def: "Independent and Identically Distributed. Each client has a representative sample of the global data distribution." },
  { term: "Non-IID",     def: "Data distribution varies per client. More realistic but harder to converge." },
  { term: "Global model",def: "The shared model maintained by the server, updated each round via aggregation." },
  { term: "Aggregation", def: "The process of combining client weight updates into a new global model." },
  { term: "FLStatus",    def: "The JSON payload returned by GET /status describing the current server state." },
  { term: "Checkpoint",  def: "A snapshot of the global model weights saved to output/ after each round." },
  { term: "Stratum",     def: "A data partition assigned to a specific client during data generation." },
];
