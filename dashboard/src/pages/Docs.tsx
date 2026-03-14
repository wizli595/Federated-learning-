import { useEffect, useRef, useState } from "react";

// ── tiny primitives ──────────────────────────────────────────────────────────

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="text-base font-semibold text-zinc-100 border-b border-zinc-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function Tag({
  color,
  children,
}: {
  color: "blue" | "emerald" | "amber" | "violet" | "red" | "zinc";
  children: React.ReactNode;
}) {
  const cls = {
    blue: "bg-blue-500/10    text-blue-400    border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10   text-amber-400   border-amber-500/20",
    violet: "bg-violet-500/10  text-violet-400  border-violet-500/20",
    red: "bg-red-500/10     text-red-400     border-red-500/20",
    zinc: "bg-zinc-800       text-zinc-400    border-zinc-700",
  }[color];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${cls}`}>
      {children}
    </span>
  );
}

function Param({
  name,
  type,
  desc,
}: {
  name: string;
  type: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="font-mono text-violet-400 shrink-0 w-32">{name}</span>
      <span className="font-mono text-amber-300/80 shrink-0">{type}</span>
      <span className="text-zinc-500">{desc}</span>
    </div>
  );
}

function Endpoint({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  const color =
    method === "GET" ? "emerald" : method === "POST" ? "blue" : "red";
  return (
    <div className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0">
      <Tag color={color}>{method}</Tag>
      <span className="font-mono text-xs text-zinc-300 shrink-0">{path}</span>
      <span className="text-xs text-zinc-500">{desc}</span>
    </div>
  );
}

// ── nav items ────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview", label: "System Overview" },
  { id: "data-flow", label: "Data Flow" },
  { id: "shared-model", label: "shared/model.py" },
  { id: "state", label: "state.py" },
  { id: "aggregation", label: "aggregation.py" },
  { id: "route-control", label: "routes/control.py" },
  { id: "route-fed", label: "routes/federation.py" },
  { id: "client-main", label: "client.py" },
  { id: "client-comms", label: "comms.py" },
  { id: "client-trainer", label: "trainer.py" },
  { id: "client-data", label: "data.py" },
  { id: "api-ref", label: "API Reference" },
];

// ── main page ────────────────────────────────────────────────────────────────

export default function Docs() {
  const [active, setActive] = useState("overview");
  const observer = useRef<IntersectionObserver | null>(null);

  // Highlight nav entry for the section currently in view
  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.current?.observe(el);
    });
    return () => observer.current?.disconnect();
  }, []);

  return (
    <div className="flex gap-8">
      {/* ── Sticky left nav ─────────────────────────────────────────── */}
      <nav className="hidden lg:flex flex-col gap-0.5 w-44 shrink-0 sticky top-0 self-start pt-1">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2 px-2">
          Sections
        </p>
        {NAV.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
              active === id
                ? "bg-blue-500/10 text-blue-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {label}
          </a>
        ))}
      </nav>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 space-y-12 min-w-0">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Code Reference
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Every file, class, and function in the FL system — core server and
            clients.
          </p>
        </div>

        {/* ── SYSTEM OVERVIEW ─────────────────────────────────────── */}
        <Section id="overview" title="System Overview">
          <Card>
            <p className="text-sm text-zinc-400 leading-relaxed">
              This project implements{" "}
              <span className="text-zinc-200 font-medium">
                Horizontal Federated Learning
              </span>
              : multiple clients each hold a private local dataset, train a
              shared model locally, and only send model weights (never raw data)
              to a central server that aggregates them.
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed mt-2">
              Three independently deployable services communicate only over
              HTTP:
            </p>
            <Code>{`┌────────────────────────────────────────────────────────────┐
│                        core/                               │
│   FastAPI server  ─── aggregation ─── global model        │
│        ▲  ▼                                                │
│    REST API  (port 8080)                                   │
└──────────────┬─────────────────────────────────────────────┘
               │  HTTP
    ┌──────────┴──────────┐
    │      clients/       │
    │  N training nodes   │
    │  (Docker replicas)  │
    └─────────────────────┘
               │  Vite dev / build
    ┌──────────┴──────────┐
    │     dashboard/      │
    │  React monitor UI   │
    │  (port 5173)        │
    └─────────────────────┘`}</Code>
          </Card>

          <Card>
            <p className="text-xs font-medium text-zinc-400 mb-2">
              Three independent packages
            </p>
            <div className="space-y-2">
              {[
                [
                  "core/",
                  "blue",
                  "FL aggregation server (FastAPI). Owns the global model, state machine, and FedAvg algorithm.",
                ],
                [
                  "clients/",
                  "emerald",
                  "Training clients (Python). Each loads a local dataset, trains locally, and submits weights.",
                ],
                [
                  "dashboard/",
                  "violet",
                  "React monitoring UI. Polls /status every 3 s and visualises training progress.",
                ],
              ].map(([name, color, desc]) => (
                <div key={name as string} className="flex gap-3 text-xs">
                  <Tag color={color as "blue" | "emerald" | "violet"}>
                    {name as string}
                  </Tag>
                  <span className="text-zinc-500">{desc as string}</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* ── DATA FLOW ───────────────────────────────────────────── */}
        <Section id="data-flow" title="Data Flow — One Round">
          <Card>
            <Code>{`Dashboard                 Server                      Client(s)
────────                 ──────                      ─────────
POST /start         →    build model
                         state = ROUND_OPEN
                                              ←   POST /register
                                              →   200 OK
                                              ←   GET  /training-config
                                              →   { local_epochs, lr, … }
                                              ←   GET  /weights
                                              →   { weights, shapes, round }
                                                  evaluate(global_weights) ← report BEFORE training
                                                  train(local_data)
                                              ←   POST /submit  { weights, loss, acc }
                         all submitted?
                         FedAvg(submissions)
                         save checkpoint
                         metrics.append(…)
                         current_round += 1
                         state = ROUND_OPEN  (or FINISHED)
GET  /status        ←    200 { state, metrics, … }
`}</Code>
          </Card>
        </Section>

        {/* ── SHARED MODEL ────────────────────────────────────────── */}
        <Section id="shared-model" title="core/shared/model.py">
          <p className="text-xs text-zinc-500">
            Single source of truth for the model architecture. Both the server
            and every client use this file — clients copy or volume-mount it so
            there are no cross-service imports.
          </p>

          <SubSection id="sm-mlp" title="class TabularMLP(nn.Module)">
            <Card>
              <Code>{`class TabularMLP(nn.Module):
    def __init__(self, input_dim: int, num_classes: int = 2)
    def forward(self, x: Tensor) -> Tensor`}</Code>
              <p className="text-xs text-zinc-500">
                A fully-connected MLP for tabular classification. Architecture:{" "}
                <span className="font-mono text-zinc-300">
                  input_dim → 128 → ReLU → 64 → ReLU → num_classes
                </span>
                .
              </p>
              <div className="space-y-1 pt-1">
                <Param
                  name="input_dim"
                  type="int"
                  desc="Number of input features (must match dataset columns)."
                />
                <Param
                  name="num_classes"
                  type="int"
                  desc="Number of output classes. Default: 2."
                />
              </div>
            </Card>
          </SubSection>

          <SubSection id="sm-build" title="build_model()">
            <Card>
              <Code>{`def build_model(input_dim: int, num_classes: int = 2) -> TabularMLP`}</Code>
              <p className="text-xs text-zinc-500">
                Factory function. Always use this instead of constructing{" "}
                <span className="font-mono text-zinc-300">TabularMLP</span>{" "}
                directly so that architecture changes propagate everywhere
                automatically.
              </p>
            </Card>
          </SubSection>

          <SubSection id="sm-weights" title="get_weights() / set_weights()">
            <Card>
              <Code>{`def get_weights(model: nn.Module) -> List[np.ndarray]
def set_weights(model: nn.Module, weights: List[np.ndarray]) -> None`}</Code>
              <p className="text-xs text-zinc-500">
                Serialize / deserialize model parameters as a list of NumPy
                arrays — one array per named parameter tensor (weights + biases,
                in order). Used by the server when broadcasting global weights
                and by clients when submitting.
              </p>
            </Card>
          </SubSection>
        </Section>

        {/* ── STATE ───────────────────────────────────────────────── */}
        <Section id="state" title="core/server/app/state.py">
          <p className="text-xs text-zinc-500">
            Single global{" "}
            <span className="font-mono text-zinc-300">fl_state</span> object
            shared by all request handlers. Protected by an{" "}
            <span className="font-mono text-zinc-300">asyncio.Lock</span> so
            concurrent requests cannot corrupt it.
          </p>

          <SubSection id="state-enum" title="enum ServerState">
            <Card>
              <Code>{`class ServerState(str, Enum):
    WAITING     = "waiting"      # no session active, ready for POST /start
    ROUND_OPEN  = "round_open"   # accepting registrations and submissions
    AGGREGATING = "aggregating"  # FedAvg running, submissions blocked
    FINISHED    = "finished"     # all rounds done`}</Code>
              <p className="text-xs text-zinc-500">
                State transitions:{" "}
                <span className="font-mono text-zinc-300">
                  WAITING → ROUND_OPEN → AGGREGATING → ROUND_OPEN → … → FINISHED
                </span>
                .
                <br />
                Stop/pause resets to WAITING. Resume reopens ROUND_OPEN without
                clearing weights.
              </p>
            </Card>
          </SubSection>

          <SubSection id="state-class" title="class FLState">
            <Card>
              <p className="text-xs font-medium text-zinc-400 mb-2">Fields</p>
              <div className="space-y-1">
                <Param
                  name="state"
                  type="ServerState"
                  desc="Current server state machine position."
                />
                <Param
                  name="current_round"
                  type="int"
                  desc="Round number in progress (1-indexed)."
                />
                <Param
                  name="total_rounds"
                  type="int"
                  desc="Total rounds requested at POST /start."
                />
                <Param
                  name="model"
                  type="nn.Module | None"
                  desc="Live PyTorch model instance."
                />
                <Param
                  name="global_weights"
                  type="List[ndarray]"
                  desc="Latest aggregated weights (broadcast to clients)."
                />
                <Param
                  name="clients"
                  type="Dict[str, dict]"
                  desc="Registered client IDs → metadata."
                />
                <Param
                  name="submissions"
                  type="Dict[str, dict]"
                  desc="Submitted weights + metrics this round."
                />
                <Param
                  name="metrics"
                  type="List[dict]"
                  desc="Per-round avg loss/accuracy history."
                />
                <Param
                  name="training_config"
                  type="dict | None"
                  desc="Hyperparams from last POST /start (epochs, lr, …)."
                />
                <Param
                  name="lock"
                  type="asyncio.Lock"
                  desc="Async mutex protecting all fields."
                />
              </div>
            </Card>
            <Card>
              <p className="text-xs font-medium text-zinc-400 mb-2">Methods</p>
              <Code>{`def reset() -> None`}</Code>
              <p className="text-xs text-zinc-500 mb-3">
                <span className="text-red-400 font-medium">Hard reset.</span>{" "}
                Wipes everything — weights, metrics, clients, config. Called by
                POST /start and POST /clients/{"{id}"}/kick-and-restart.
              </p>
              <Code>{`def soft_reset() -> None`}</Code>
              <p className="text-xs text-zinc-500">
                <span className="text-amber-400 font-medium">Soft pause.</span>{" "}
                Clears only
                <span className="font-mono text-zinc-300">
                  {" "}
                  clients
                </span> and{" "}
                <span className="font-mono text-zinc-300">submissions</span>,
                sets state to WAITING. Preserves{" "}
                <span className="font-mono text-zinc-300">global_weights</span>,
                <span className="font-mono text-zinc-300"> metrics</span>, and
                round counters so training can resume exactly where it left off.
              </p>
            </Card>
          </SubSection>
        </Section>

        {/* ── AGGREGATION ─────────────────────────────────────────── */}
        <Section id="aggregation" title="core/server/app/aggregation.py">
          <SubSection id="agg-fedavg" title="fedavg()">
            <Card>
              <Code>{`def fedavg(submissions: Dict[str, dict]) -> List[np.ndarray]`}</Code>
              <p className="text-xs text-zinc-500">
                Implements the{" "}
                <span className="text-zinc-200">Federated Averaging</span>{" "}
                algorithm. Each client's weights are scaled by the fraction of
                total training samples they contributed, then summed:
              </p>
              <Code>{`w_global = Σ  (n_i / n_total) * w_i     for each client i`}</Code>
              <p className="text-xs text-zinc-500">
                Clients with larger datasets have proportionally more influence
                on the global model.
              </p>
            </Card>
          </SubSection>

          <SubSection id="agg-advance" title="aggregate_and_advance()">
            <Card>
              <Code>{`async def aggregate_and_advance(state: FLState) -> None`}</Code>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Orchestrates a full aggregation cycle. Steps:
              </p>
              <ol className="text-xs text-zinc-500 list-decimal list-inside space-y-1 mt-2">
                <li>
                  Acquires the lock, transitions state to AGGREGATING (blocks
                  late submissions).
                </li>
                <li>
                  Calls{" "}
                  <span className="font-mono text-zinc-300">fedavg()</span> on
                  all this-round submissions.
                </li>
                <li>
                  Updates{" "}
                  <span className="font-mono text-zinc-300">
                    state.global_weights
                  </span>{" "}
                  and applies them to the live model.
                </li>
                <li>
                  Appends round metrics (avg loss, avg accuracy, num_clients) to
                  history.
                </li>
                <li>
                  Saves a PyTorch checkpoint to{" "}
                  <span className="font-mono text-zinc-300">OUTPUT_PATH</span> (
                  <code>/output/global_model.pt</code>).
                </li>
                <li>
                  If{" "}
                  <span className="font-mono text-zinc-300">
                    current_round &lt; total_rounds
                  </span>
                  : increments round, clears submissions, state → ROUND_OPEN.
                </li>
                <li>Otherwise: state → FINISHED.</li>
              </ol>
            </Card>
          </SubSection>
        </Section>

        {/* ── ROUTES CONTROL ──────────────────────────────────────── */}
        <Section id="route-control" title="core/server/app/routes/control.py">
          <p className="text-xs text-zinc-500">
            Session lifecycle endpoints — used by the dashboard.
          </p>

          {[
            {
              method: "GET",
              path: "/health",
              desc: "Liveness probe. Returns {status: 'ok'}. No auth, no state required.",
              req: null,
              res: `{ "status": "ok" }`,
            },
            {
              method: "GET",
              path: "/status",
              desc: "Full server snapshot. Polled by the dashboard every 3 s.",
              req: null,
              res: `{ state, current_round, total_rounds,\n  registered_clients, submissions_this_round,\n  submitted_client_ids, client_ids,\n  metrics, training_config }`,
            },
            {
              method: "GET",
              path: "/training-config",
              desc: "Clients fetch this after registering to get local_epochs and learning_rate set by the dashboard. Returns HTTP 425 if training hasn't started yet.",
              req: null,
              res: `{ local_epochs, learning_rate, total_rounds, input_dim, num_classes }`,
            },
            {
              method: "POST",
              path: "/start",
              desc: "Hard reset + initialise a new global model + open round 1. Allowed from WAITING or FINISHED state.",
              req: `{ input_dim, num_classes, rounds,\n  local_epochs, learning_rate }`,
              res: `{ message, round: 1 }`,
            },
            {
              method: "POST",
              path: "/stop",
              desc: "Soft-pause. Preserves global_weights, metrics, and round counter. Clears clients and submissions. State → WAITING.",
              req: null,
              res: `{ message, stopped_at_round }`,
            },
            {
              method: "POST",
              path: "/resume",
              desc: "Reopen the current round without resetting anything. Clients re-register and continue. Only valid when state=WAITING and current_round > 0.",
              req: null,
              res: `{ message, round }`,
            },
          ].map(({ method, path, desc, req, res }) => (
            <Card key={path}>
              <div className="flex items-center gap-2 mb-1">
                <Tag color={method === "GET" ? "emerald" : "blue"}>
                  {method}
                </Tag>
                <span className="font-mono text-sm text-zinc-200">{path}</span>
              </div>
              <p className="text-xs text-zinc-500">{desc}</p>
              {req && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                    Request body
                  </p>
                  <Code>{req}</Code>
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                  Response
                </p>
                <Code>{res}</Code>
              </div>
            </Card>
          ))}
        </Section>

        {/* ── ROUTES FEDERATION ───────────────────────────────────── */}
        <Section id="route-fed" title="core/server/app/routes/federation.py">
          <p className="text-xs text-zinc-500">
            Client-facing endpoints — called by training clients, not the
            dashboard.
          </p>

          {[
            {
              method: "POST",
              path: "/register?client_id=<id>",
              desc: "Client announces itself. Adds the client to fl_state.clients. Rejected if state=WAITING or FINISHED.",
              req: null,
              res: `{ client_id, message }`,
            },
            {
              method: "GET",
              path: "/weights",
              desc: "Download the current global weights. Only available when state=ROUND_OPEN. Returns weights as flat lists plus their original shapes for reshaping.",
              req: null,
              res: `{ round, weights: [[…], …], shapes: [[…], …] }`,
            },
            {
              method: "POST",
              path: "/submit",
              desc: "Client uploads locally-trained weights + metrics. Triggers aggregate_and_advance() when all registered clients (or MIN_CLIENTS) have submitted.",
              req: `{ client_id, num_samples, weights, shapes, loss, accuracy }`,
              res: `{ message, round }`,
            },
            {
              method: "POST",
              path: "/clients/{client_id}/kick",
              desc: "Remove a client mid-round. Simulates dropout. If remaining clients have all submitted, triggers aggregation immediately. Only allowed in ROUND_OPEN or AGGREGATING.",
              req: null,
              res: `{ message, remaining_clients }`,
            },
            {
              method: "POST",
              path: "/clients/{client_id}/kick-and-restart",
              desc: "Permanently remove a client, hard-reset state, and immediately reopen round 1 with the same training config. Remaining clients detect the reset and re-register automatically.",
              req: null,
              res: `{ message, round: 1 }`,
            },
          ].map(({ method, path, desc, req, res }) => (
            <Card key={path}>
              <div className="flex items-center gap-2 mb-1">
                <Tag color={method === "GET" ? "emerald" : "blue"}>
                  {method}
                </Tag>
                <span className="font-mono text-sm text-zinc-200">{path}</span>
              </div>
              <p className="text-xs text-zinc-500">{desc}</p>
              {req && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                    Request body
                  </p>
                  <Code>{req}</Code>
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                  Response
                </p>
                <Code>{res}</Code>
              </div>
            </Card>
          ))}
        </Section>

        {/* ── CLIENT MAIN ─────────────────────────────────────────── */}
        <Section id="client-main" title="clients/client.py">
          <p className="text-xs text-zinc-500">
            Entry point for each client container. Runs the full training loop.
          </p>

          <SubSection id="cl-main" title="main()">
            <Card>
              <Code>{`def main() -> None`}</Code>
              <p className="text-xs text-zinc-500 mb-3">
                Orchestrates the entire client lifecycle:
              </p>
              <ol className="text-xs text-zinc-500 list-decimal list-inside space-y-1.5">
                <li>
                  <span className="font-mono text-zinc-300">
                    load_data(DATA_PATH)
                  </span>{" "}
                  — load and split the local CSV dataset.
                </li>
                <li>
                  <span className="font-mono text-zinc-300">
                    wait_for_server_ready()
                  </span>{" "}
                  — block until{" "}
                  <span className="font-mono text-zinc-300">
                    state == round_open
                  </span>
                  .
                </li>
                <li>
                  <span className="font-mono text-zinc-300">register()</span> —
                  announce this client to the server.
                </li>
                <li>
                  <span className="font-mono text-zinc-300">
                    fetch_training_config()
                  </span>{" "}
                  — pull epochs/lr set by the dashboard.
                </li>
                <li>
                  <span className="font-mono text-zinc-300">build_model()</span>{" "}
                  — instantiate the shared architecture.
                </li>
                <li className="font-medium text-zinc-400">Loop forever:</li>
                <li className="ml-4">
                  <span className="font-mono text-zinc-300">
                    fetch_weights()
                  </span>{" "}
                  → apply to model.
                </li>
                <li className="ml-4">
                  <span className="font-mono text-zinc-300">evaluate()</span> →
                  measure global model accuracy <em>before</em> local training.
                </li>
                <li className="ml-4">
                  <span className="font-mono text-zinc-300">train()</span> →
                  fine-tune on local data.
                </li>
                <li className="ml-4">
                  <span className="font-mono text-zinc-300">submit()</span> →
                  upload trained weights + pre-training metrics.
                </li>
                <li className="ml-4">
                  <span className="font-mono text-zinc-300">
                    wait_for_next_round()
                  </span>{" "}
                  → if <code>server_reset</code>, re-register and loop; if{" "}
                  <code>finished</code>, wait for next session.
                </li>
              </ol>
            </Card>
          </SubSection>

          <Card>
            <p className="text-xs font-medium text-zinc-400">
              Why evaluate BEFORE training?
            </p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Accuracy is measured on the freshly-downloaded <em>global</em>{" "}
              weights before any local fine-tuning. This ensures the dashboard
              shows true global model performance, not how well an individual
              client's local model fits its own data.
            </p>
          </Card>
        </Section>

        {/* ── CLIENT COMMS ────────────────────────────────────────── */}
        <Section id="client-comms" title="clients/app/comms.py">
          <p className="text-xs text-zinc-500">
            All HTTP communication with the server. Each function retries on
            failure.
          </p>

          {[
            {
              name: "wait_for_server_ready()",
              sig: "def wait_for_server_ready() -> None",
              desc: "Polls GET /status in a loop (up to MAX_RETRIES) until state == 'round_open'. Raises RuntimeError if the server never starts.",
            },
            {
              name: "register()",
              sig: "def register() -> None",
              desc: "POST /register?client_id=<CLIENT_ID>. Retries up to MAX_RETRIES. Called once at startup and again after any server reset.",
            },
            {
              name: "fetch_weights()",
              sig: "def fetch_weights() -> Tuple[List[np.ndarray], int]",
              desc: "GET /weights. Returns (weights, round_number). Reconstructs NumPy arrays from flat lists using shape metadata.",
            },
            {
              name: "submit()",
              sig: "def submit(weights, num_samples, loss, accuracy) -> None",
              desc: "POST /submit. Sends locally-trained weights (flattened), shapes, sample count, and pre-training metrics (loss/accuracy from global model evaluation).",
            },
            {
              name: "fetch_training_config()",
              sig: "def fetch_training_config() -> dict",
              desc: "GET /training-config. Falls back to an empty dict (local YAML defaults are used) if the endpoint is unavailable. Called after every re-registration so new hyperparams take effect on restart.",
            },
            {
              name: "wait_for_next_round()",
              sig: "def wait_for_next_round(current_round: int) -> str",
              desc: "Polls /status until: 'next_round' (round > current), 'finished' (state=finished), or 'server_reset' (state=waiting — server was paused or restarted). The 'server_reset' signal causes the client to re-register and continue rather than exit.",
            },
          ].map(({ name, sig, desc }) => (
            <SubSection key={name} id={`comms-${name}`} title={name}>
              <Card>
                <Code>{sig}</Code>
                <p className="text-xs text-zinc-500">{desc}</p>
              </Card>
            </SubSection>
          ))}
        </Section>

        {/* ── CLIENT TRAINER ──────────────────────────────────────── */}
        <Section id="client-trainer" title="clients/app/trainer.py">
          {[
            {
              name: "train()",
              sig: "def train(model, X_train, y_train,\n         epochs=None, lr=None) -> float",
              desc: "Runs local training with the Adam optimizer and CrossEntropyLoss. epochs and lr default to the values from the YAML config (LOCAL_EPOCHS, LR) if not provided — overridden by values from the server when set via the dashboard. Returns average training loss across all epochs.",
            },
            {
              name: "evaluate()",
              sig: "def evaluate(model, X_test, y_test) -> Tuple[float, float]",
              desc: "Runs the model in eval mode (no gradient) on the held-out test set. Returns (avg_loss, accuracy). Called with global weights before local training each round.",
            },
          ].map(({ name, sig, desc }) => (
            <SubSection key={name} id={`trainer-${name}`} title={name}>
              <Card>
                <Code>{sig}</Code>
                <p className="text-xs text-zinc-500">{desc}</p>
              </Card>
            </SubSection>
          ))}
        </Section>

        {/* ── CLIENT DATA ─────────────────────────────────────────── */}
        <Section id="client-data" title="clients/app/data.py">
          <SubSection id="data-load" title="load_data()">
            <Card>
              <Code>{`def load_data(path: str) -> Tuple[Tensor, Tensor, Tensor, Tensor]
#  returns: X_train, X_test, y_train, y_test`}</Code>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Loads a CSV file (no header — last column is the label). Applies
                <span className="font-mono text-zinc-300">
                  {" "}
                  StandardScaler
                </span>{" "}
                to features,
                <span className="font-mono text-zinc-300">
                  {" "}
                  train_test_split
                </span>{" "}
                with stratification (test fraction from{" "}
                <span className="font-mono text-zinc-300">TEST_SPLIT</span> in
                config), and converts everything to PyTorch float/long tensors.
              </p>
            </Card>
          </SubSection>
        </Section>

        {/* ── API REFERENCE ───────────────────────────────────────── */}
        <Section id="api-ref" title="API Quick Reference">
          <Card>
            <p className="text-xs font-medium text-zinc-400 mb-3">
              Base URL:{" "}
              <span className="font-mono text-zinc-300">
                http://localhost:8080
              </span>
            </p>
            <Endpoint method="GET" path="/health" desc="Liveness check." />
            <Endpoint
              method="GET"
              path="/status"
              desc="Full server state snapshot."
            />
            <Endpoint
              method="GET"
              path="/training-config"
              desc="Fetch hyperparameters (for clients)."
            />
            <Endpoint
              method="POST"
              path="/start"
              desc="Hard reset + begin new session."
            />
            <Endpoint
              method="POST"
              path="/stop"
              desc="Soft pause (preserves weights)."
            />
            <Endpoint
              method="POST"
              path="/resume"
              desc="Reopen current round after pause."
            />
            <Endpoint
              method="POST"
              path="/register"
              desc="Client registration."
            />
            <Endpoint
              method="GET"
              path="/weights"
              desc="Download global weights."
            />
            <Endpoint
              method="POST"
              path="/submit"
              desc="Upload trained weights."
            />
            <Endpoint
              method="POST"
              path="/clients/{id}/kick"
              desc="Remove client mid-round."
            />
            <Endpoint
              method="POST"
              path="/clients/{id}/kick-and-restart"
              desc="Remove client + restart session."
            />
          </Card>
        </Section>
      </div>
    </div>
  );
}
