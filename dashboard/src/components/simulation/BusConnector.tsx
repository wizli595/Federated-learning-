import { useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import type { SimEmail } from "./types";
import { PRESETS, C, gte } from "./types";

interface Props {
  email: SimEmail;
  index: number;
  total: number;
  side: "left" | "right";
}

export function BusConnector({ email, index, total, side }: Props) {
  const isFirst = index === 0;
  const isLast  = index === total - 1;

  const active = side === "left" ? email.status === "sending"     : email.status === "delivering";
  const done   = side === "left" ? gte(email.status, "at-server") : email.status === "done";

  const colorKey  = email.customized ? "custom" : PRESETS[email.preset].color;
  const beamColor = side === "left"
    ? C[colorKey].beam
    : (email.result?.label === "spam" ? C.red.beam : C.emerald.beam);

  const busEdge = side === "left" ? "right" : "left";

  const progress  = useMotionValue(0);
  const fillWidth = useTransform(progress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    if (active || done) {
      animate(progress, 1, { duration: 0.75, ease: "easeInOut" });
    } else {
      progress.set(0);
    }
  }, [active, done]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-0">
      {!isFirst && (
        <div className="absolute w-px bg-zinc-800"
          style={{ [busEdge]: 0, top: 0, height: "calc(50% - 4px)" }} />
      )}
      {!isLast && (
        <div className="absolute w-px bg-zinc-800"
          style={{ [busEdge]: 0, top: "calc(50% + 4px)", bottom: 0 }} />
      )}
      <div className="absolute inset-x-0 bg-zinc-800" style={{ top: "50%", height: 1 }} />

      <motion.div
        className="absolute left-0 h-px origin-left"
        style={{
          top: "50%",
          width: fillWidth,
          background: `linear-gradient(to right, transparent, ${beamColor})`,
          boxShadow: active ? `0 0 8px 1px ${beamColor}88` : "none",
        }}
      />

      <AnimatePresence>
        {active && (
          <motion.div
            key="dot"
            className="absolute w-2.5 h-2.5 rounded-full z-10"
            style={{
              top: "calc(50% - 5px)",
              backgroundColor: beamColor,
              boxShadow: `0 0 12px 4px ${beamColor}99`,
            }}
            initial={{ left: "0%", opacity: 0 }}
            animate={{ left: "calc(100% - 10px)", opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="absolute w-2 h-2 rounded-full z-20"
        style={{ top: "calc(50% - 4px)", [busEdge]: -4 }}
        animate={{
          scale: active ? [1, 1.5, 1] : 1,
          backgroundColor: done || active ? beamColor : "#3f3f46",
        }}
        transition={{ duration: active ? 0.8 : 0.3, repeat: active ? Infinity : 0 }}
      />
    </div>
  );
}
