import { NavLink } from "react-router-dom";
import { LayoutDashboard, LineChart, Users, BookOpen, FileCode2, Wifi, WifiOff } from "lucide-react";

const NAV = [
  { to: "/",            label: "Overview",    icon: LayoutDashboard },
  { to: "/metrics",     label: "Metrics",     icon: LineChart        },
  { to: "/clients",     label: "Clients",     icon: Users            },
];

const NAV_BOTTOM = [
  { to: "/explanation", label: "How it works",  icon: BookOpen   },
  { to: "/docs",        label: "Code Reference", icon: FileCode2  },
];

export default function Sidebar({ connected }: { connected: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col z-10">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-zinc-800">
        <span className="font-mono font-semibold text-zinc-100 text-sm tracking-tight">FL Monitor</span>
        <p className="text-xs text-zinc-500 mt-0.5">Federated Learning</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
              ${isActive
                ? "bg-blue-500/10 text-blue-400 font-medium"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600">Learn</p>
        </div>

        {NAV_BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer
              ${isActive
                ? "bg-blue-500/10 text-blue-400 font-medium"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Connection status */}
      <div className="px-5 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          {connected
            ? <Wifi size={14} className="text-emerald-400" />
            : <WifiOff size={14} className="text-red-400" />
          }
          <span className={`text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
            {connected ? "Server connected" : "Server offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
