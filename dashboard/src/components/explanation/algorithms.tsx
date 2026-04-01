export function FedAvg() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        The default aggregation strategy is{" "}
        <span className="text-zinc-200">Federated Averaging (FedAvg)</span>, introduced by McMahan et al.
        (2017). Each client's contribution is weighted by its number of training samples:
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
        Clients with more data exert proportionally greater influence. A client with 800 samples contributes
        4× more than one with 200 samples. This handles imbalanced client sizes naturally. FedAvg assumes{" "}
        <span className="text-zinc-200">synchronous rounds</span> — the server waits for all clients before aggregating.
      </p>
    </>
  );
}

export function FedProxSection() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        <span className="text-zinc-200">FedProx</span> extends FedAvg by adding a proximal term to each
        client's local loss. This penalises large deviations from the global model:
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
          { t: "μ = 0",       c: "text-zinc-300",   d: "Reduces FedProx to plain FedAvg." },
          { t: "μ = 0.1",     c: "text-violet-400", d: "Recommended starting point. Limits local drift while still allowing meaningful local optimization." },
          { t: "μ = 1.0",     c: "text-amber-400",  d: "Strong regularization. Local models barely move from the global weights — good for very heterogeneous systems." },
          { t: "When it helps",    c: "text-emerald-400", d: "Partial work (clients that cannot finish all epochs), slow clients, system heterogeneity." },
          { t: "When it does not help", c: "text-red-400",  d: "Extreme data heterogeneity. If clients have completely incompatible objectives, the proximal term cannot reconcile them." },
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

export function DPSection() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Before submitting weights to the Flower server, each client applies{" "}
        <span className="text-zinc-200">Differential Privacy</span> noise. This limits what any observer
        (including the server) can infer about the individual training samples.
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 font-mono text-xs space-y-1">
        <p className="text-zinc-500"># step 1 — clip L2 norm of each weight tensor</p>
        <p className="text-zinc-300">clipped = w / <span className="text-amber-400">max</span>(1.0, ‖w‖ / clip_norm)</p>
        <p className="text-zinc-500 mt-2"># step 2 — add Gaussian noise</p>
        <p className="text-zinc-300">noised = clipped + <span className="text-blue-400">N</span>(0, noise_mult × clip_norm, shape)</p>
      </div>
      <div className="space-y-3">
        {[
          { t: "clip_norm (default 1.0)", c: "text-amber-400", d: "L2 clipping threshold. Any weight tensor with norm > clip_norm is scaled down to clip_norm. This bounds the sensitivity — the maximum impact one training sample can have." },
          { t: "noise_mult (default 0.05)", c: "text-blue-400", d: "Noise standard deviation = noise_mult × clip_norm. Lower = better accuracy, weaker privacy. Higher = stronger privacy, more degradation. A value of 0.05 adds mild noise." },
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

export function ModelArch() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        The model is a{" "}
        <span className="text-zinc-200">Tabular Multi-Layer Perceptron (TabularMLP)</span> — a feed-forward
        network for structured data classification. Architecture (
        <code className="text-zinc-300 text-xs">fl/shared/model.py</code>):
      </p>
      <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 font-mono text-xs space-y-1">
        {[
          ["text-blue-400",   "Input",  "→  [20 features]"],
          ["text-amber-400",  "Linear", "(20 → 128)  + BatchNorm1d + ReLU + Dropout(0.3)"],
          ["text-amber-400",  "Linear", "(128 → 64)  + BatchNorm1d + ReLU + Dropout(0.3)"],
          ["text-emerald-400","Output", "Linear(64 → 2)  →  logits  →  softmax"],
        ].map(([c, label, rest]) => (
          <p key={label as string}>
            <span className={c as string}>{label as string}</span>
            <span className="text-zinc-400"> {rest as string}</span>
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
        <span className="text-zinc-300">input_dim = 20</span> (must match FEATURE_NAMES length in fl/shared/features.py) &nbsp;·&nbsp;
        <span className="text-zinc-300">num_classes = 2</span> (0 = ham, 1 = spam)
      </p>
    </>
  );
}

export function NonIID() {
  return (
    <>
      <p className="text-sm text-zinc-400 leading-relaxed">
        In real FL each client's data is{" "}
        <span className="text-zinc-200">not independently and identically distributed (non-IID)</span>.
        This is the central challenge — local models trained on skewed data diverge, making aggregation
        less effective.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-emerald-400 mb-1">IID (ideal)</p>
          <p className="text-xs text-zinc-500">Each client is a random sample of the global distribution. FedAvg converges fast and reliably.</p>
        </div>
        <div className="bg-zinc-800/60 border border-red-500/10 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Non-IID (reality)</p>
          <p className="text-xs text-zinc-500">Each client has skewed distributions. Local models develop different gradients, slowing or destabilising global convergence.</p>
        </div>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        In this app non-IID is simulated through spam profiles: the marketing client has 70% spam dominated
        by url_count and keywords, while the phishing client has 70% spam dominated by caps_ratio and
        urgency_words. You can see the effect in the Training metrics — early rounds often oscillate as
        profiles pull the global model in different directions before converging.
      </p>
      <div className="space-y-2">
        {[
          { t: "FedProx",       d: "Adds a proximal term to pull local models back toward the global model, reducing drift." },
          { t: "SCAFFOLD",      d: "Control variates that correct the local gradient direction. More expensive but more stable under extreme non-IID." },
          { t: "FedNova",       d: "Normalises local updates by the number of steps taken, compensating for heterogeneous local epochs." },
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
