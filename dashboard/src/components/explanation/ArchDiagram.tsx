export function ArchDiagram() {
  return (
    <div className="overflow-x-auto -mx-1">
      <svg
        viewBox="0 0 920 510"
        className="w-full h-auto min-w-[640px]"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker id="ah"      markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#94a3b8"/></marker>
          <marker id="ah-blue" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#60a5fa"/></marker>
          <marker id="ah-grn"  markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#34d399"/></marker>
          <marker id="ah-vio"  markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#a78bfa"/></marker>
          <marker id="ah-cyan" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#22d3ee"/></marker>
        </defs>

        {/* ── Background ── */}
        <rect width="920" height="510" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5"/>

        {/* ── Docker badge (top-right) ── */}
        <rect x="732" y="4" width="180" height="20" rx="5" fill="#e0f2fe" stroke="#2496ed" strokeWidth="1"/>
        {/* Docker whale icon */}
        <g transform="translate(744,14)">
          {/* whale body */}
          <path d="M0,3 C-1,-1 1,-4 4,-4 L12,-4 C13,-4 14,-3 13,-1 L12,3 Z" fill="#2496ed"/>
          {/* tail */}
          <path d="M0,3 L-3,5 L0,6 Z" fill="#2496ed"/>
          {/* water spout */}
          <path d="M3,-4 C3,-7 4,-8 4,-8 C4,-8 5,-7 5,-4" stroke="#0ea5e9" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          {/* containers */}
          <rect x="2"  y="-3.5" width="3" height="2" rx="0.3" fill="white" opacity="0.85"/>
          <rect x="6"  y="-3.5" width="3" height="2" rx="0.3" fill="white" opacity="0.85"/>
          <rect x="10" y="-3.5" width="3" height="2" rx="0.3" fill="white" opacity="0.85"/>
        </g>
        <text x="764" y="19" fontSize="10" fontWeight="700" fill="#2496ed">Docker — all services containerized</text>

        {/* ══════════════════════════════════════
             BOXES
        ══════════════════════════════════════ */}

        {/* ZooKeeper */}
        <rect x="358" y="14" width="166" height="48" rx="9" fill="white" stroke="#f59e0b" strokeWidth="1.8"/>
        <text x="441" y="33"  textAnchor="middle" fontSize="9"  fontWeight="600" fill="#92400e" letterSpacing="1.5">APACHE</text>
        <text x="441" y="52"  textAnchor="middle" fontSize="16" fontWeight="800" fill="#d97706">ZooKeeper</text>

        {/* HDFS */}
        <rect x="744" y="26" width="136" height="48" rx="9" fill="white" stroke="#f97316" strokeWidth="1.8"/>
        <text x="812" y="45"  textAnchor="middle" fontSize="9"  fontWeight="600" fill="#9a3412" letterSpacing="1.5">APACHE</text>
        <text x="812" y="64"  textAnchor="middle" fontSize="18" fontWeight="800" fill="#ea580c">HDFS</text>

        {/* Flower Server */}
        <rect x="14" y="82" width="152" height="50" rx="9" fill="white" stroke="#22c55e" strokeWidth="1.8"/>
        <text x="90" y="103" textAnchor="middle" fontSize="12" fontWeight="700" fill="#166534">Flower Server</text>
        <text x="90" y="121" textAnchor="middle" fontSize="10" fill="#15803d">gRPC  :8090</text>

        {/* FL Clients group */}
        <rect x="14" y="158" width="152" height="158" rx="10" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.8"/>
        <text x="90" y="178" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e40af">FL Clients</text>
        <rect x="28" y="186" width="124" height="30" rx="6" fill="white" stroke="#bfdbfe" strokeWidth="1"/>
        <text x="90" y="206" textAnchor="middle" fontSize="10" fill="#1d4ed8">alice</text>
        <rect x="28" y="226" width="124" height="30" rx="6" fill="white" stroke="#bfdbfe" strokeWidth="1"/>
        <text x="90" y="246" textAnchor="middle" fontSize="10" fill="#1d4ed8">meriem</text>
        <rect x="28" y="266" width="124" height="30" rx="6" fill="white" stroke="#bfdbfe" strokeWidth="1"/>
        <text x="90" y="286" textAnchor="middle" fontSize="10" fill="#1d4ed8">fdfff</text>
        <text x="90" y="308" textAnchor="middle" fontSize="9" fill="#93c5fd">local training + DP noise</text>

        {/* Apache Kafka  — central hub */}
        <rect x="292" y="192" width="252" height="86" rx="14" fill="white" stroke="#0f172a" strokeWidth="2.5"/>
        <text x="418" y="222" textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b" letterSpacing="4">APACHE</text>
        <text x="418" y="262" textAnchor="middle" fontSize="34" fontWeight="900" fill="#0f172a" letterSpacing="-1">kafka</text>

        {/* Worker */}
        <rect x="626" y="138" width="158" height="52" rx="9" fill="white" stroke="#8b5cf6" strokeWidth="1.8"/>
        <text x="705" y="160" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5b21b6">Worker</text>
        <text x="705" y="180" textAnchor="middle" fontSize="10" fill="#7c3aed">FedAvg Aggregator</text>

        {/* Controller API */}
        <rect x="446" y="356" width="164" height="52" rx="9" fill="white" stroke="#10b981" strokeWidth="1.8"/>
        <text x="528" y="378" textAnchor="middle" fontSize="12" fontWeight="700" fill="#065f46">Controller API</text>
        <text x="528" y="397" textAnchor="middle" fontSize="10" fill="#059669">FastAPI  :8080</text>

        {/* SQLite */}
        <rect x="264" y="372" width="138" height="44" rx="9" fill="white" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="333" y="391" textAnchor="middle" fontSize="11" fontWeight="700" fill="#475569">SQLite</text>
        <text x="333" y="408" textAnchor="middle" fontSize="9"  fill="#94a3b8">experiment history</text>

        {/* Dashboard */}
        <rect x="644" y="362" width="160" height="52" rx="9" fill="white" stroke="#06b6d4" strokeWidth="1.8"/>
        <text x="724" y="384" textAnchor="middle" fontSize="12" fontWeight="700" fill="#164e63">Dashboard</text>
        <text x="724" y="402" textAnchor="middle" fontSize="10" fill="#0891b2">React + Nginx  :3000</text>

        {/* ══════════════════════════════════════
             LOGOS
        ══════════════════════════════════════ */}

        {/* ZooKeeper — Apache feather */}
        <g transform="translate(372,28)">
          <path d="M0,-9 C4,-6 5,-1 2,7 L0,5 L-2,7 C-5,-1 -4,-6 0,-9Z" fill="#f59e0b" opacity="0.9"/>
          <line x1="0" y1="-6" x2="0" y2="5" stroke="#fffbeb" strokeWidth="0.8" opacity="0.5"/>
        </g>

        {/* HDFS — Hadoop elephant (simplified) */}
        <g transform="translate(758,50)">
          <circle cx="0" cy="-1" r="7" fill="#fbbf24"/>
          <ellipse cx="6" cy="-1" rx="3.5" ry="5.5" fill="#fde68a"/>
          <path d="M-4.5,4 C-8,5 -9,9 -6,10" stroke="#d97706" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <circle cx="-1" cy="-3" r="1.1" fill="#78350f"/>
        </g>

        {/* Flower Server — Flwr petals */}
        <g transform="translate(28,107)">
          <circle cx="0"    cy="-6"  r="3" fill="#22c55e"/>
          <circle cx="5.7"  cy="-1.9" r="3" fill="#22c55e"/>
          <circle cx="3.5"  cy="5"   r="3" fill="#22c55e"/>
          <circle cx="-3.5" cy="5"   r="3" fill="#22c55e"/>
          <circle cx="-5.7" cy="-1.9" r="3" fill="#22c55e"/>
          <circle cx="0"    cy="0"   r="2.5" fill="white"/>
        </g>

        {/* Apache Kafka — official hub-and-spoke node graph */}
        <g transform="translate(312,235)">
          <circle cx="-11" cy="-7" r="2.5" fill="white" stroke="#475569" strokeWidth="1"/>
          <circle cx="-11" cy="0"  r="2.5" fill="white" stroke="#475569" strokeWidth="1"/>
          <circle cx="-11" cy="7"  r="2.5" fill="white" stroke="#475569" strokeWidth="1"/>
          <circle cx="0"   cy="0"  r="3.5" fill="white" stroke="#0f172a" strokeWidth="1.5"/>
          <circle cx="11"  cy="-7" r="2.5" fill="white" stroke="#475569" strokeWidth="1"/>
          <circle cx="11"  cy="0"  r="2.5" fill="white" stroke="#475569" strokeWidth="1"/>
          <circle cx="11"  cy="7"  r="2.5" fill="white" stroke="#475569" strokeWidth="1"/>
          <line x1="-8.5" y1="-6.3" x2="-3.5" y2="-1.5" stroke="#94a3b8" strokeWidth="0.8"/>
          <line x1="-8.5" y1="0"    x2="-3.5" y2="0"    stroke="#94a3b8" strokeWidth="0.8"/>
          <line x1="-8.5" y1="6.3"  x2="-3.5" y2="1.5"  stroke="#94a3b8" strokeWidth="0.8"/>
          <line x1="3.5"  y1="-1.5" x2="8.5"  y2="-6.3" stroke="#94a3b8" strokeWidth="0.8"/>
          <line x1="3.5"  y1="0"    x2="8.5"  y2="0"    stroke="#94a3b8" strokeWidth="0.8"/>
          <line x1="3.5"  y1="1.5"  x2="8.5"  y2="6.3"  stroke="#94a3b8" strokeWidth="0.8"/>
        </g>

        {/* Worker — gear/cog */}
        <g transform="translate(640,164)">
          <circle cx="0" cy="0" r="5.5" fill="none" stroke="#8b5cf6" strokeWidth="2.2"/>
          <circle cx="0" cy="0" r="2.3" fill="#8b5cf6"/>
          <line x1="0"    y1="-5.5" x2="0"    y2="-8.5" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3.9"  y1="-3.9" x2="6"    y2="-6"   stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="5.5"  y1="0"    x2="8.5"  y2="0"    stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="3.9"  y1="3.9"  x2="6"    y2="6"    stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="0"    y1="5.5"  x2="0"    y2="8.5"  stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="-3.9" y1="3.9"  x2="-6"   y2="6"    stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="-5.5" y1="0"    x2="-8.5" y2="0"    stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="-3.9" y1="-3.9" x2="-6"   y2="-6"   stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round"/>
        </g>

        {/* Controller API — FastAPI lightning bolt */}
        <g transform="translate(462,382)">
          <path d="M2,-8 L-3,0 L-0.5,0 L-2,8 L3,0 L0.5,0 Z" fill="#10b981"/>
        </g>

        {/* SQLite — database cylinder */}
        <g transform="translate(278,394)">
          <rect x="-6" y="-5" width="12" height="9" fill="#64748b"/>
          <ellipse cx="0" cy="-5" rx="6" ry="2.2" fill="#94a3b8"/>
          <ellipse cx="0" cy="4"  rx="6" ry="2.2" fill="#64748b" stroke="#475569" strokeWidth="0.5"/>
          <line x1="-5.5" y1="-1.8" x2="5.5" y2="-1.8" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.4"/>
          <line x1="-5.5" y1="0.5"  x2="5.5" y2="0.5"  stroke="#e2e8f0" strokeWidth="0.6" opacity="0.4"/>
          <line x1="-5.5" y1="2.8"  x2="5.5" y2="2.8"  stroke="#e2e8f0" strokeWidth="0.6" opacity="0.4"/>
        </g>

        {/* Dashboard — React atom */}
        <g transform="translate(658,388)">
          <ellipse cx="0" cy="0" rx="9" ry="3.5" stroke="#22d3ee" strokeWidth="1.4" fill="none"/>
          <ellipse cx="0" cy="0" rx="9" ry="3.5" stroke="#22d3ee" strokeWidth="1.4" fill="none" transform="rotate(60)"/>
          <ellipse cx="0" cy="0" rx="9" ry="3.5" stroke="#22d3ee" strokeWidth="1.4" fill="none" transform="rotate(120)"/>
          <circle cx="0" cy="0" r="1.8" fill="#22d3ee"/>
        </g>

        {/* ══════════════════════════════════════
             ARROWS
        ══════════════════════════════════════ */}

        {/* Flower → FL Clients  (gRPC rounds) */}
        <line x1="90" y1="132" x2="90" y2="158" stroke="#22c55e" strokeWidth="1.8" markerEnd="url(#ah-grn)"/>
        <text x="96" y="149" fontSize="9" fill="#15803d">gRPC rounds</text>

        {/* FL Clients → Kafka  (client.weights) */}
        <line x1="166" y1="228" x2="292" y2="232" stroke="#60a5fa" strokeWidth="1.8" markerEnd="url(#ah-blue)"/>
        <text x="229" y="220" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1d4ed8">client.weights</text>

        {/* Kafka → FL Clients  (global.weights) */}
        <line x1="292" y1="256" x2="166" y2="262" stroke="#34d399" strokeWidth="1.8" markerEnd="url(#ah-grn)"/>
        <text x="229" y="276" textAnchor="middle" fontSize="9" fontWeight="600" fill="#047857">global.weights</text>

        {/* Kafka → ZooKeeper  (coordinates, dashed) */}
        <line x1="418" y1="192" x2="437" y2="62" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ah)"/>
        <text x="433" y="132" fontSize="9" fill="#64748b">coordinates</text>

        {/* Kafka → Worker  (client.weights topic) */}
        <line x1="544" y1="224" x2="626" y2="164" stroke="#60a5fa" strokeWidth="1.8" markerEnd="url(#ah-blue)"/>
        <text x="596" y="186" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1d4ed8">client.weights</text>

        {/* Worker → Kafka  (global.weights + fl.metrics) */}
        <line x1="626" y1="180" x2="544" y2="252" stroke="#a78bfa" strokeWidth="1.8" markerEnd="url(#ah-vio)"/>
        <text x="610" y="218" textAnchor="start" fontSize="9" fontWeight="600" fill="#6d28d9">global.weights</text>
        <text x="610" y="230" textAnchor="start" fontSize="9" fill="#6d28d9">+ fl.metrics</text>

        {/* Worker → HDFS  (store weights) */}
        <line x1="716" y1="138" x2="786" y2="74" stroke="#f97316" strokeWidth="1.8" markerEnd="url(#ah)"/>
        <text x="762" y="103" textAnchor="middle" fontSize="9" fontWeight="600" fill="#c2410c">store weights</text>

        {/* Kafka → Controller  (fl.metrics) */}
        <line x1="462" y1="278" x2="502" y2="356" stroke="#34d399" strokeWidth="1.8" markerEnd="url(#ah-grn)"/>
        <text x="494" y="322" textAnchor="middle" fontSize="9" fontWeight="600" fill="#047857">fl.metrics</text>

        {/* Kafka → SQLite  (experiments) */}
        <line x1="356" y1="278" x2="336" y2="372" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#ah)"/>
        <text x="325" y="336" textAnchor="end" fontSize="9" fill="#64748b">experiments</text>

        {/* Controller → Dashboard  (REST API) */}
        <line x1="610" y1="382" x2="644" y2="388" stroke="#22d3ee" strokeWidth="1.8" markerEnd="url(#ah-cyan)"/>
        <text x="627" y="376" textAnchor="middle" fontSize="9" fontWeight="600" fill="#0891b2">REST API</text>

        {/* ══════════════════════════════════════
             TOPIC LEGEND
        ══════════════════════════════════════ */}
        <rect x="14" y="440" width="890" height="56" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1"/>
        <text x="26" y="458" fontSize="10" fontWeight="700" fill="#475569">Kafka Topics</text>

        {/* blue */}
        <rect x="112" y="446" width="9" height="9" rx="2" fill="#60a5fa"/>
        <text x="125" y="456" fontSize="9" fill="#1d4ed8">client.weights — FL clients publish weights each round</text>
        <rect x="112" y="460" width="9" height="9" rx="2" fill="#a78bfa"/>
        <text x="125" y="469" fontSize="9" fill="#6d28d9">global.weights — Worker publishes aggregated model</text>

        {/* green */}
        <rect x="420" y="446" width="9" height="9" rx="2" fill="#34d399"/>
        <text x="433" y="456" fontSize="9" fill="#047857">fl.metrics — Worker publishes round accuracy / loss</text>
        <rect x="420" y="460" width="9" height="9" rx="2" fill="#94a3b8"/>
        <text x="433" y="469" fontSize="9" fill="#475569">fl.status — Controller broadcasts training state</text>

      </svg>
    </div>
  );
}
