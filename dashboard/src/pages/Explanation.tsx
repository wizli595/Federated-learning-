import { useState } from "react";
import {
  ChevronDown, Shield, Server, GitMerge, Database, Lock,
  Shuffle, Cpu, BarChart2, Zap, Mail, Users, PlayCircle, FlaskConical,
} from "lucide-react";
import PageShell from "../components/PageShell";
import { AppFlow, WhatIsFL, WhyFLEmail } from "../components/explanation/intro";
import { Architecture, Profiles } from "../components/explanation/architecture";
import { Features } from "../components/explanation/features";
import { FedAvg, FedProxSection, DPSection, ModelArch, NonIID } from "../components/explanation/algorithms";
import { TrainingCfg, MetricsGuide } from "../components/explanation/training";
import { Experiments, PrivacyTable, Glossary } from "../components/explanation/results";

const SECTIONS = [
  { id: "app-flow",      icon: Zap,          color: "text-blue-400",   title: "Full App Flow — Step by Step",        Content: AppFlow },
  { id: "what-is-fl",   icon: Shield,        color: "text-violet-400", title: "What is Federated Learning?",         Content: WhatIsFL },
  { id: "why-fl-email", icon: Mail,          color: "text-emerald-400",title: "Why Federated Learning for Email Spam?", Content: WhyFLEmail },
  { id: "architecture", icon: Server,        color: "text-red-400",    title: "System Architecture (3 Services)",    Content: Architecture },
  { id: "profiles",     icon: Users,         color: "text-amber-400",  title: "Client Profiles & Non-IID Data",      Content: Profiles },
  { id: "features",     icon: Database,      color: "text-cyan-400",   title: "Email Feature Set (20 Features)",     Content: Features },
  { id: "fedavg",       icon: GitMerge,      color: "text-blue-400",   title: "FedAvg Aggregation Algorithm",        Content: FedAvg },
  { id: "fedprox",      icon: GitMerge,      color: "text-violet-400", title: "FedProx — Proximal Term Algorithm",   Content: FedProxSection },
  { id: "dp",           icon: Lock,          color: "text-purple-400", title: "Differential Privacy (DP Noise)",     Content: DPSection },
  { id: "model",        icon: Cpu,           color: "text-cyan-400",   title: "Model Architecture — TabularMLP",     Content: ModelArch },
  { id: "non-iid",      icon: Shuffle,       color: "text-orange-400", title: "Non-IID Challenges & Solutions",      Content: NonIID },
  { id: "training-cfg", icon: PlayCircle,    color: "text-green-400",  title: "Training Parameters Explained",       Content: TrainingCfg },
  { id: "metrics",      icon: BarChart2,     color: "text-pink-400",   title: "Reading the Training Metrics",        Content: MetricsGuide },
  { id: "experiments",  icon: FlaskConical,  color: "text-orange-400", title: "Experiment Results",                  Content: Experiments },
  { id: "privacy-table",icon: Shield,        color: "text-emerald-400",title: "Privacy Design — What Gets Shared",   Content: PrivacyTable },
  { id: "glossary",     icon: Database,      color: "text-zinc-400",   title: "Glossary",                            Content: Glossary },
];

export default function Explanation() {
  const [open, setOpen] = useState<string | null>("app-flow");

  return (
    <PageShell
      title="Documentation"
      subtitle="Everything about SpamFL — full app flow, algorithms, features, and privacy design."
      size="sm"
    >
      <div className="space-y-3">
        {SECTIONS.map(({ id, icon: Icon, color, title, Content }) => (
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
                <Content />
              </div>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
