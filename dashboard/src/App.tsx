import { Routes, Route } from "react-router-dom";
import { useFL } from "./hooks/useFL";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import Metrics from "./pages/Metrics";
import Clients from "./pages/Clients";
import Explanation from "./pages/Explanation";
import Docs        from "./pages/Docs";

export default function App() {
  const { data, error, loading, events, eta } = useFL();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500">Connecting to FL server...</p>
        </div>
      </div>
    );
  }

  // Explanation page is always accessible even if server is down
  const serverDown = error || !data;

  return (
    <div className="flex h-full">
      <Sidebar connected={!error} />
      <main className="ml-56 flex-1 p-8 overflow-y-auto">
        {serverDown ? (
          <Routes>
            <Route path="/explanation" element={<Explanation />} />
            <Route path="/docs"        element={<Docs />} />
            <Route path="*" element={
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-red-400 font-medium">Server unreachable</p>
                  <p className="text-zinc-500 text-sm">{error}</p>
                  <p className="text-zinc-600 text-xs">Make sure the FL server is running on port 8080</p>
                </div>
              </div>
            } />
          </Routes>
        ) : (
          <Routes>
            <Route path="/"            element={<Overview data={data!} events={events} eta={eta} />} />
            <Route path="/metrics"     element={<Metrics  data={data!} />} />
            <Route path="/clients"     element={<Clients  data={data!} />} />
            <Route path="/explanation" element={<Explanation />} />
            <Route path="/docs"        element={<Docs />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
