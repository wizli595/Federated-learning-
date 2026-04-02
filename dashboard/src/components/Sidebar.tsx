import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Users, PlayCircle, BookOpen, Wifi, WifiOff, ShieldAlert, FlaskConical,
  ChevronLeft, ChevronRight, X, ScrollText, Network, BrainCircuit,
} from "lucide-react";

const NAV = [
  { to: "/clients",    label: "Clients",    icon: Users        },
  { to: "/training",   label: "Training",   icon: PlayCircle   },
  { to: "/simulation", label: "Simulation", icon: Network      },
  { to: "/logs",       label: "Logs",       icon: ScrollText   },
  { to: "/experiments",label: "Experiments",icon: FlaskConical },
];

const NAV_BOTTOM = [
  { to: "/model",       label: "Model",     icon: BrainCircuit },
  { to: "/explanation", label: "Docs",      icon: BookOpen     },
];

interface SidebarProps {
  connected: boolean;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  connected, open, collapsed, onClose, onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();
  const inboxActive = location.pathname.includes("/inbox");

  // Escape closes the mobile overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const navClass = (isActive: boolean, extra = false) => {
    const active = isActive || extra;
    return [
      "flex items-center py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer",
      collapsed ? "justify-center" : "gap-3 px-3",
      active
        ? [
            "text-blue-400 font-medium bg-blue-500/10",
            !collapsed ? "shadow-[inset_2px_0_0_0_rgb(96,165,250)] translate-x-0.5" : "",
          ].join(" ")
        : [
            "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
            !collapsed ? "hover:translate-x-0.5" : "",
          ].join(" "),
    ].join(" ");
  };

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 flex flex-col z-30",
        "bg-zinc-900 border-r border-zinc-800",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-14" : "w-56",
        // mobile: slide in/out; desktop: always visible
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}
    >
      {/* Logo */}
      <div
        className={[
          "relative flex items-center border-b border-zinc-800 py-5",
          collapsed ? "justify-center" : "px-5",
        ].join(" ")}
      >
        {collapsed ? (
          <ShieldAlert size={20} className="text-blue-400" />
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-blue-400" />
              <span className="font-mono font-semibold text-zinc-100 text-sm tracking-tight">SpamFL</span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Federated Spam Detection</p>
          </div>
        )}

        {/* Mobile close button */}
        <button
          className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                     text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main nav */}
      <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} py-4 space-y-1`}>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => navClass(isActive, to === "/clients" && inboxActive)}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {collapsed ? (
          <div className="my-2 border-t border-zinc-800/60" />
        ) : (
          <div className="pt-3 pb-1">
            <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600">Learn</p>
          </div>
        )}

        {NAV_BOTTOM.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => navClass(isActive)}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800">
        {/* Desktop collapse toggle */}
        <button
          className="hidden md:flex w-full items-center justify-center py-2.5
                     text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar  ([ key)" : "Collapse sidebar  ([ key)"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Connection status */}
        <div className={`${collapsed ? "flex justify-center" : "px-5"} py-3`}>
          {collapsed ? (
            <span
              className="relative flex h-2 w-2"
              title={connected ? "Connected to controller" : "Controller offline"}
            >
              {connected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                {connected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                )}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
              </span>
              {connected
                ? <Wifi size={14} className="text-emerald-400" />
                : <WifiOff size={14} className="text-red-400" />
              }
              <span className={`text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
                {connected ? "Connected" : "Offline"}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
