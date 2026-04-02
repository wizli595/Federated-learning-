import type { ExperimentRun, RoundMetric } from "../../services/api";

// ─── PDF export ────────────────────────────────────────────────────────────

function buildSvgChart(rounds: RoundMetric[]): string {
  if (rounds.length < 2) return "";
  const W = 580, H = 160, PL = 48, PR = 20, PT = 20, PB = 30;
  const n = rounds.length;
  const maxLoss = Math.max(...rounds.map((r) => r.avg_loss));

  const pt = (i: number, val: number, lo: number, hi: number) => {
    const x = PL + (i / (n - 1)) * (W - PL - PR);
    const y = PT + ((hi - val) / (hi - lo || 1)) * (H - PT - PB);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const accPts = rounds.map((r, i) => pt(i, r.avg_accuracy, 0, 1)).join(" ");
  const lsPts  = rounds.map((r, i) => pt(i, r.avg_loss, 0, maxLoss)).join(" ");

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((v) => {
    const y = PT + (1 - v) * (H - PT - PB);
    return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W - PR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>
            <text x="${PL - 6}" y="${(y + 4).toFixed(1)}" font-size="9" fill="#9ca3af" text-anchor="end">${(v * 100).toFixed(0)}%</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    ${gridLines}
    <polyline points="${lsPts}"  fill="none" stroke="#f87171" stroke-width="1.8" stroke-linejoin="round"/>
    <polyline points="${accPts}" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linejoin="round"/>
    <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#d1d5db" stroke-width="1"/>
    <text x="${PL}" y="${H - 8}" font-size="9" fill="#9ca3af">Round 1</text>
    <text x="${W - PR}" y="${H - 8}" font-size="9" fill="#9ca3af" text-anchor="end">Round ${n}</text>
    <line x1="${W - 190}" y1="12" x2="${W - 170}" y2="12" stroke="#10b981" stroke-width="2"/>
    <text x="${W - 165}" y="16" font-size="9" fill="#374151">Accuracy</text>
    <line x1="${W - 105}" y1="12" x2="${W - 85}" y2="12" stroke="#f87171" stroke-width="2"/>
    <text x="${W - 80}" y="16" font-size="9" fill="#374151">Loss (norm.)</text>
  </svg>`;
}

export function exportRunPdf(run: ExperimentRun): void {
  const win = window.open("", "_blank");
  if (!win) { alert("Allow popups to export the PDF report."); return; }

  const rounds    = run.metrics?.rounds ?? [];
  const bestAcc   = rounds.length ? Math.max(...rounds.map((r) => r.avg_accuracy)) : null;
  const lastRound = rounds[rounds.length - 1];

  const configRows = [
    ["Algorithm",     run.algorithm.toUpperCase()],
    ["Rounds",        String(run.rounds)],
    ["Local Epochs",  String(run.local_epochs)],
    ["Learning Rate", run.learning_rate.toFixed(4)],
    ["FedProx \u03bc",  run.mu.toFixed(3)],
    ["DP Clip Norm",  run.clip_norm.toFixed(2)],
    ["DP Noise Mult", run.noise_mult.toFixed(3)],
    ["Min Clients",   String(run.min_clients)],
    ["Num Clients",   String(run.num_clients)],
  ].map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`).join("");

  const roundRows = rounds.map((r) =>
    `<tr>
      <td>#${r.round}</td>
      <td>${r.avg_loss.toFixed(4)}</td>
      <td class="green">${(r.avg_accuracy * 100).toFixed(1)}%</td>
      <td>${r.f1 != null ? r.f1.toFixed(3) : "\u2014"}</td>
      <td>${Object.keys(r.clients).join(", ")}</td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>SpamFL \u2014 Experiment Run #${run.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#111827;background:#fff;padding:36px 44px;max-width:860px;margin:0 auto}
  @media print{body{padding:0}}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}
  .logo{font-size:22px;font-weight:800;letter-spacing:-0.5px}.logo span{color:#3b82f6}
  .meta{text-align:right;color:#6b7280;font-size:11px;line-height:1.7}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:22px 0 8px}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px}
  .card .val{font-size:22px;font-weight:700}.card .lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
  .green{color:#059669;font-weight:600}.red{color:#dc2626}.blue{color:#3b82f6}
  table{width:100%;border-collapse:collapse}
  th{background:#f9fafb;border:1px solid #e5e7eb;padding:6px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600}
  td{border:1px solid #e5e7eb;padding:6px 10px;font-size:12px}
  tr:nth-child(even) td{background:#f9fafb}
  .chart-box{border:1px solid #e5e7eb;border-radius:8px;padding:16px}
  .footer{margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
</style>
</head>
<body>
<div class="hdr">
  <div>
    <div class="logo">Spam<span>FL</span></div>
    <div style="font-size:11px;color:#6b7280;margin-top:3px">Federated Learning Training Report</div>
  </div>
  <div class="meta">
    Run #${run.id}<br/>
    ${fmtDate(run.started_at)}<br/>
    ${run.algorithm.toUpperCase()} &middot; ${run.num_clients} clients
  </div>
</div>

<h2>Summary</h2>
<div class="summary">
  <div class="card"><div class="val green">${fmtPct(run.final_accuracy ?? 0)}</div><div class="lbl">Final Accuracy</div></div>
  <div class="card"><div class="val red">${fmtLoss(run.final_loss ?? null)}</div><div class="lbl">Final Loss</div></div>
  <div class="card"><div class="val green">${bestAcc != null ? fmtPct(bestAcc) : "\u2014"}</div><div class="lbl">Best Accuracy</div></div>
  <div class="card"><div class="val blue">${lastRound?.f1 != null ? lastRound.f1.toFixed(3) : "\u2014"}</div><div class="lbl">Final F1 Score</div></div>
</div>

<h2>Configuration</h2>
<table><tbody>${configRows}</tbody></table>

${rounds.length >= 2 ? `<h2>Convergence</h2><div class="chart-box">${buildSvgChart(rounds)}</div>` : ""}

<h2>Round History</h2>
<table>
  <thead><tr><th>Round</th><th>Avg Loss</th><th>Avg Accuracy</th><th>F1</th><th>Clients</th></tr></thead>
  <tbody>${roundRows}</tbody>
</table>

<div class="footer">
  <span>SpamFL &mdash; Federated Spam Detection</span>
  <span>Generated ${new Date().toLocaleString()}</span>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

export const ALGO_COLOR: Record<string, string> = {
  fedavg:  "text-blue-400  bg-blue-400/10  border-blue-400/20",
  fedprox: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

export const RUN_A_COLOR = "#818cf8"; // indigo
export const RUN_B_COLOR = "#fb923c"; // orange

export function fmtPct(v: number | null)  { return v == null ? "—" : `${(v * 100).toFixed(1)}%`; }
export function fmtLoss(v: number | null) { return v == null ? "—" : v.toFixed(4); }
export function fmtDate(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export function buildCompareChartData(a: ExperimentRun, b: ExperimentRun) {
  const ra = a.metrics?.rounds ?? [];
  const rb = b.metrics?.rounds ?? [];
  const maxRound = Math.max(
    ra.length > 0 ? Math.max(...ra.map((r) => r.round)) : 0,
    rb.length > 0 ? Math.max(...rb.map((r) => r.round)) : 0,
  );
  return Array.from({ length: maxRound }, (_, i) => {
    const round = i + 1;
    const ma = ra.find((r) => r.round === round);
    const mb = rb.find((r) => r.round === round);
    return {
      round,
      acc_a:  ma != null ? +(ma.avg_accuracy * 100).toFixed(1) : null,
      acc_b:  mb != null ? +(mb.avg_accuracy * 100).toFixed(1) : null,
      loss_a: ma != null ? ma.avg_loss : null,
      loss_b: mb != null ? mb.avg_loss : null,
    };
  });
}

// ─── Comparison PDF export ─────────────────────────────────────────────────

type CompareChartRow = ReturnType<typeof buildCompareChartData>[number];

function buildCompareSvg(
  data: CompareChartRow[],
  keyA: keyof CompareChartRow,
  keyB: keyof CompareChartRow,
  labelA: string,
  labelB: string,
  isPercent: boolean,
): string {
  const valsA = data.map((d) => d[keyA] as number | null).filter((v): v is number => v != null);
  const valsB = data.map((d) => d[keyB] as number | null).filter((v): v is number => v != null);
  const all   = [...valsA, ...valsB];
  if (all.length < 2) return "";

  const W = 270, H = 140, PL = 44, PR = 10, PT = 18, PB = 24;
  const n  = data.length;
  const lo = Math.min(...all) * 0.97;
  const hi = Math.max(...all) * 1.03;

  const pt = (i: number, val: number | null): string | null => {
    if (val == null) return null;
    const x = PL + (i / Math.max(n - 1, 1)) * (W - PL - PR);
    const y = PT + ((hi - val) / (hi - lo || 1)) * (H - PT - PB);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const ptsA = data.map((d, i) => pt(i, d[keyA] as number | null)).filter(Boolean).join(" ");
  const ptsB = data.map((d, i) => pt(i, d[keyB] as number | null)).filter(Boolean).join(" ");

  const grid = [lo, (lo + hi) / 2, hi].map((v) => {
    const y = PT + ((hi - v) / (hi - lo || 1)) * (H - PT - PB);
    const lbl = isPercent ? `${v.toFixed(1)}%` : v.toFixed(3);
    return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${W - PR}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>
            <text x="${(PL - 3).toFixed(0)}" y="${(y + 3.5).toFixed(1)}" font-size="8" fill="#9ca3af" text-anchor="end">${lbl}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    ${grid}
    <polyline points="${ptsA}" fill="none" stroke="#818cf8" stroke-width="1.8" stroke-linejoin="round"/>
    <polyline points="${ptsB}" fill="none" stroke="#fb923c" stroke-width="1.8" stroke-linejoin="round" stroke-dasharray="5,3"/>
    <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#d1d5db" stroke-width="1"/>
    <text x="${PL}" y="${H - 8}" font-size="8" fill="#9ca3af">R1</text>
    <text x="${W - PR}" y="${H - 8}" font-size="8" fill="#9ca3af" text-anchor="end">R${n}</text>
    <line x1="${W - 125}" y1="12" x2="${W - 110}" y2="12" stroke="#818cf8" stroke-width="2"/>
    <text x="${W - 105}" y="15" font-size="8" fill="#374151">${labelA}</text>
    <line x1="${W - 60}" y1="12" x2="${W - 45}" y2="12" stroke="#fb923c" stroke-width="2" stroke-dasharray="4,2"/>
    <text x="${W - 40}" y="15" font-size="8" fill="#374151">${labelB}</text>
  </svg>`;
}

export function exportComparePdf(
  a: ExperimentRun,
  b: ExperimentRun,
  chartData: CompareChartRow[],
  bestId: number | null,
): void {
  const win = window.open("", "_blank");
  if (!win) { alert("Allow popups to export the PDF report."); return; }

  const winner  = (a.final_accuracy ?? 0) >= (b.final_accuracy ?? 0) ? a : b;
  const loser   = winner.id === a.id ? b : a;
  const accDiff = Math.abs((a.final_accuracy ?? 0) - (b.final_accuracy ?? 0)) * 100;

  const svgAcc  = buildCompareSvg(chartData, "acc_a",  "acc_b",  `Run #${a.id}`, `Run #${b.id}`, true);
  const svgLoss = buildCompareSvg(chartData, "loss_a", "loss_b", `Run #${a.id}`, `Run #${b.id}`, false);

  const paramRows = PARAM_DEFS_RAW.map(({ key, label, fmt }) => {
    const va = fmt(a[key as keyof ExperimentRun] as ExperimentRun[keyof ExperimentRun]);
    const vb = fmt(b[key as keyof ExperimentRun] as ExperimentRun[keyof ExperimentRun]);
    const diff = va !== vb;
    return `<tr${diff ? ' class="diff"' : ""}>
      <td>${label}</td>
      <td style="color:${diff ? "#4f46e5" : "#374151"};font-weight:${diff ? "700" : "400"}">${va}</td>
      <td style="color:${diff ? "#c2410c" : "#374151"};font-weight:${diff ? "700" : "400"}">${vb}</td>
      <td style="color:#9ca3af">${diff ? "\u2260" : "\u2014"}</td>
    </tr>`;
  }).join("");

  const winnerConfig = [
    ["Algorithm",  winner.algorithm.toUpperCase()],
    ["Rounds",     String(winner.rounds)],
    ["Epochs",     String(winner.local_epochs)],
    ["LR",         winner.learning_rate.toFixed(4)],
    ["Clip Norm",  winner.clip_norm.toFixed(2)],
    ["Noise Mult", winner.noise_mult.toFixed(3)],
    ["Clients",    String(winner.num_clients)],
  ].map(([k, v]) => `<tr><td>${k}</td><td><strong>${v}</strong></td></tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>SpamFL &mdash; Comparison Run #${a.id} vs Run #${b.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#111827;background:#fff;padding:36px 44px;max-width:860px;margin:0 auto}
  @media print{body{padding:0}}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}
  .logo{font-size:22px;font-weight:800;letter-spacing:-0.5px}.logo span{color:#3b82f6}
  .meta{text-align:right;color:#6b7280;font-size:11px;line-height:1.7}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:22px 0 8px}
  .winner{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:4px}
  .winner p{font-size:12px;color:#166534;font-weight:600}
  .winner span{font-weight:400;color:#4b5563}
  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px}
  .card .val{font-size:18px;font-weight:700}.card .lbl{font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:2px}
  .ia{color:#4f46e5}.ib{color:#c2410c}.green{color:#059669;font-weight:600}
  .charts{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .chart-box{border:1px solid #e5e7eb;border-radius:8px;padding:12px}
  .chart-box p{font-size:10px;color:#9ca3af;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse}
  th{background:#f9fafb;border:1px solid #e5e7eb;padding:5px 9px;text-align:left;font-size:11px;color:#6b7280;font-weight:600}
  td{border:1px solid #e5e7eb;padding:5px 9px;font-size:11px}
  tr.diff td{background:#fafafa}
  .rec{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px}
  .rec p{font-size:11px;color:#92400e;font-weight:600;margin-bottom:8px}
  .footer{margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="logo">Spam<span>FL</span></div>
    <div style="font-size:11px;color:#6b7280;margin-top:3px">A/B Comparison Report &mdash; Run #${a.id} vs Run #${b.id}</div>
  </div>
  <div class="meta">
    Generated ${new Date().toLocaleString()}<br/>
    <span class="ia">&#x2588; Run #${a.id}</span> &nbsp; <span class="ib">&#x2588; Run #${b.id}</span>
  </div>
</div>

<div class="winner">
  <p>Run #${winner.id} wins &mdash; ${fmtPct(winner.final_accuracy)} accuracy
    <span>${accDiff > 0.05 ? ` (+${accDiff.toFixed(1)} pp over Run #${loser.id})` : " (near tie)"}
    ${winner.id === bestId ? " &mdash; overall best run" : ""}</span>
  </p>
</div>

<h2>Summary</h2>
<div class="summary">
  <div class="card"><div class="val ia">${fmtPct(a.final_accuracy)}</div><div class="lbl">Run #${a.id} Accuracy</div></div>
  <div class="card"><div class="val ib">${fmtPct(b.final_accuracy)}</div><div class="lbl">Run #${b.id} Accuracy</div></div>
  <div class="card"><div class="val ia">${fmtLoss(a.final_loss)}</div><div class="lbl">Run #${a.id} Loss</div></div>
  <div class="card"><div class="val ib">${fmtLoss(b.final_loss)}</div><div class="lbl">Run #${b.id} Loss</div></div>
</div>

${svgAcc || svgLoss ? `
<h2>Convergence Charts</h2>
<div class="charts">
  <div class="chart-box"><p>Accuracy per round</p>${svgAcc}</div>
  <div class="chart-box"><p>Loss per round</p>${svgLoss}</div>
</div>` : ""}

<h2>Parameter Comparison</h2>
<table>
  <thead><tr>
    <th>Param</th>
    <th style="color:#4f46e5">Run #${a.id}${a.id === bestId ? " \uD83C\uDFC6" : ""}</th>
    <th style="color:#c2410c">Run #${b.id}${b.id === bestId ? " \uD83C\uDFC6" : ""}</th>
    <th>\u0394</th>
  </tr></thead>
  <tbody>${paramRows}</tbody>
</table>

<h2>Recommended Config (Run #${winner.id})</h2>
<div class="rec">
  <p>Use Run #${winner.id}'s settings for your next training run</p>
  <table style="width:auto"><tbody>${winnerConfig}</tbody></table>
</div>

<div class="footer">
  <span>SpamFL &mdash; Federated Spam Detection</span>
  <span>Generated ${new Date().toLocaleString()}</span>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

// raw param defs used by both PDF exporters
const PARAM_DEFS_RAW = [
  { key: "algorithm",     label: "Algorithm",     fmt: String },
  { key: "rounds",        label: "Rounds",        fmt: String },
  { key: "local_epochs",  label: "Local Epochs",  fmt: String },
  { key: "learning_rate", label: "Learning Rate", fmt: (v: ExperimentRun[keyof ExperimentRun]) => Number(v).toFixed(4) },
  { key: "mu",            label: "FedProx \u03bc",   fmt: (v: ExperimentRun[keyof ExperimentRun]) => Number(v).toFixed(3) },
  { key: "clip_norm",     label: "DP Clip Norm",  fmt: (v: ExperimentRun[keyof ExperimentRun]) => Number(v).toFixed(2) },
  { key: "noise_mult",    label: "DP Noise Mult", fmt: (v: ExperimentRun[keyof ExperimentRun]) => Number(v).toFixed(3) },
  { key: "num_clients",   label: "Clients",       fmt: String },
];

export const PARAM_DEFS: { key: keyof ExperimentRun; label: string; fmt: (v: ExperimentRun[keyof ExperimentRun]) => string }[] = [
  { key: "algorithm",     label: "Algorithm",     fmt: String },
  { key: "rounds",        label: "Rounds",         fmt: String },
  { key: "local_epochs",  label: "Local Epochs",   fmt: String },
  { key: "learning_rate", label: "Learning Rate",  fmt: (v) => Number(v).toFixed(4) },
  { key: "mu",            label: "FedProx μ",      fmt: (v) => Number(v).toFixed(3) },
  { key: "clip_norm",     label: "DP Clip Norm",   fmt: (v) => Number(v).toFixed(2) },
  { key: "noise_mult",    label: "DP Noise Mult",  fmt: (v) => Number(v).toFixed(3) },
  { key: "num_clients",   label: "Clients",        fmt: String },
];
