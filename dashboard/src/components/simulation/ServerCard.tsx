import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Lock } from "lucide-react";
import type { SimEmail } from "./types";
import { gte } from "./types";

interface Props {
  emails: SimEmail[];
  active: boolean;
}

export function ServerCard({ emails, active }: Props) {
  return (
    <motion.div
      className={`rounded-2xl border flex flex-col transition-colors duration-300 ${
        active ? "border-blue-500/50 bg-zinc-900" : "border-zinc-800 bg-zinc-900/60"
      }`}
      animate={active ? { boxShadow: ["0 0 0px #3b82f600", "0 0 32px #3b82f644", "0 0 0px #3b82f600"] } : { boxShadow: "none" }}
      transition={active ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <div className="flex flex-col items-center gap-4 p-5">
        <div className="relative">
          <motion.div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              active ? "bg-blue-500/20" : "bg-zinc-800/60"
            }`}
            animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={active ? { duration: 1.5, repeat: Infinity } : {}}
          >
            <Cpu size={26} className={active ? "text-blue-400" : "text-zinc-500"} />
          </motion.div>
          {active && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-blue-400/30"
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-200">FL Classifier</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">TabularMLP · 20 features</p>
        </div>

        <div className="w-full space-y-2.5 max-h-24 overflow-y-auto">
          {emails.map((e) => {
            const isDone = gte(e.status, "delivering");
            return (
              <motion.div
                key={e.id}
                animate={{ opacity: e.status === "at-server" ? 1 : isDone ? 0.45 : 0.18 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 text-[11px]"
              >
                <motion.div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    e.status === "at-server"              ? "bg-blue-400" :
                    isDone && e.result?.label === "spam"  ? "bg-red-400" :
                    isDone                                ? "bg-emerald-400" :
                    "bg-zinc-700"
                  }`}
                  animate={e.status === "at-server" ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                  transition={{ duration: 0.8, repeat: e.status === "at-server" ? Infinity : 0 }}
                />
                <span className="text-zinc-500 truncate min-w-0 flex-1">{e.from}</span>
                <AnimatePresence mode="wait">
                  {isDone && e.result && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`font-bold shrink-0 text-[10px] ${
                        e.result.label === "spam" ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {e.result.label.toUpperCase()}
                    </motion.span>
                  )}
                  {e.status === "at-server" && (
                    <motion.span
                      key="processing"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="text-blue-400 text-[10px] shrink-0"
                    >
                      …
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-zinc-700 mt-auto">
          <Lock size={9} /> DP noise applied
        </div>
      </div>
    </motion.div>
  );
}
