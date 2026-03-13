import { type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "amber" | "emerald" | "zinc";
  sub?: string;
}

const ACCENT = {
  blue:    { icon: "text-blue-400",    border: "border-blue-500/20",   bg: "bg-blue-500/5"    },
  amber:   { icon: "text-amber-400",   border: "border-amber-500/20",  bg: "bg-amber-500/5"   },
  emerald: { icon: "text-emerald-400", border: "border-emerald-500/20",bg: "bg-emerald-500/5" },
  zinc:    { icon: "text-zinc-400",    border: "border-zinc-700",      bg: "bg-zinc-900"      },
};

export default function StatCard({ label, value, icon: Icon, accent = "zinc", sub }: Props) {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <Icon size={16} className={a.icon} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-mono font-semibold text-zinc-100">{value}</span>
        {sub && <span className="text-sm text-zinc-500 mb-1">{sub}</span>}
      </div>
    </div>
  );
}
