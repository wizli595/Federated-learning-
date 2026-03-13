import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import { type ActivityEvent } from "../../hooks/useFL";

function EventIcon({ type }: { type: ActivityEvent["type"] }) {
  if (type === "success") return <CheckCircle  size={13} className="text-emerald-400 mt-0.5 shrink-0" />;
  if (type === "warning") return <AlertTriangle size={13} className="text-amber-400  mt-0.5 shrink-0" />;
  return                         <Info          size={13} className="text-blue-400   mt-0.5 shrink-0" />;
}

export default function ActivityLog({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-300">Activity Log</h2>
      </div>
      <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-zinc-800/50">
        {events.length === 0 ? (
          <p className="px-4 py-6 text-xs text-zinc-500 text-center">No events yet.</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="px-4 py-2.5 flex gap-2.5 items-start">
              <EventIcon type={e.type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-snug">{e.message}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                  {e.time.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
