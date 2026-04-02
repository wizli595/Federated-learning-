import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Menu, ShieldAlert } from "lucide-react";
import Sidebar         from "./components/Sidebar";
import ClientManager   from "./pages/ClientManager";
import Training        from "./pages/Training";
import ClientInbox     from "./pages/ClientInbox";
import Explanation     from "./pages/Explanation";
import ExperimentsPage from "./pages/ExperimentsPage";
import Logs            from "./pages/Logs";
import SimulationPage  from "./pages/SimulationPage";
import ModelPage       from "./pages/ModelPage";
import Login           from "./pages/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { health }      from "./services/api";

const PAGE_NAMES: Record<string, string> = {
  "/clients":    "Clients",
  "/training":   "Training",
  "/logs":       "Logs",
  "/simulation": "Simulation",
  "/experiments":"Experiments",
  "/model":      "Model",
  "/explanation":"Docs",
};

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell() {
  const [connected,        setConnected]        = useState(false);
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const check = () =>
      health()
        .then(() => setConnected(true))
        .catch(() => setConnected(false));
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  // [ key toggles sidebar collapse on desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      setSidebarCollapsed((c) => !c);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pageName = location.pathname.includes("/inbox")
    ? "Client Inbox"
    : PAGE_NAMES[location.pathname] ?? "SpamFL";

  return (
    <div className="flex h-full">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        connected={connected}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 h-14
                      bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800
                      flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert size={16} className="text-blue-400 shrink-0" />
          <span className="font-mono font-semibold text-zinc-100 text-sm truncate">{pageName}</span>
        </div>
        <div className="ml-auto shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
          </span>
        </div>
      </div>

      <main
        key={location.pathname}
        className={[
          "flex-1 overflow-y-auto animate-fade-in-up",
          "pt-14 p-4 md:p-8",
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "md:ml-14" : "md:ml-56",
        ].join(" ")}
      >
        {!connected && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            Controller offline — make sure it is running on port 8080
          </div>
        )}

        <Routes>
          <Route path="/"                        element={<Navigate to="/clients" replace />} />
          <Route path="/clients"                 element={<ClientManager />} />
          <Route path="/clients/:clientId/inbox" element={<ClientInbox />} />
          <Route path="/training"                element={<Training />} />
          <Route path="/logs"                    element={<Logs />} />
          <Route path="/simulation"              element={<SimulationPage />} />
          <Route path="/experiments"             element={<ExperimentsPage />} />
          <Route path="/model"                   element={<ModelPage />} />
          <Route path="/explanation"             element={<Explanation />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*"     element={<RequireAuth><AppShell /></RequireAuth>} />
      </Routes>
    </AuthProvider>
  );
}
