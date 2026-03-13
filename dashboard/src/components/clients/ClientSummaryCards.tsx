import { Users, CheckCircle, Clock } from "lucide-react";
import StatCard from "../ui/StatCard";
import ProgressBar from "../ui/ProgressBar";

interface Props {
  totalClients: number;
  submitted:    number;
  pending:      number;
  currentRound: number;
}

export default function ClientSummaryCards({ totalClients, submitted, pending, currentRound }: Props) {
  const pct = totalClients > 0 ? (submitted / totalClients) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total"     value={totalClients} icon={Users}        accent="zinc"    />
        <StatCard label="Submitted" value={submitted}    icon={CheckCircle}  accent="emerald" />
        <StatCard label="Pending"   value={pending}      icon={Clock}        accent="amber"   />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <ProgressBar
          value={pct}
          color="emerald"
          labelLeft={`Round ${currentRound} submissions`}
          labelRight={`${submitted} / ${totalClients}`}
        />
      </div>
    </div>
  );
}
