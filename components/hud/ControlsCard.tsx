"use client";

import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";

const controls = [
  ["WASD", "Move"],
  ["Space", "Jump"],
  ["Shift", "Sprint"],
  ["Mouse", "Camera"],
];

export default function ControlsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="
        pointer-events-auto
        w-[240px]
        rounded-[24px]
        border
        border-white/[0.04]
        bg-gradient-to-b
        from-[#1b1b1b]/95
        to-[#141414]/95
        px-4
        py-4
        backdrop-blur-xl
        shadow-[0_0.5px_0px_#ffffff10_inset,0_1px_1px_#ffffff08_inset,0_10px_20px_-12px_#00000090]
      "
    >
      

      {/* CONTROLS */}
      <div className="space-y-2">
        {controls.map(([key, label]) => (
          <div
            key={key}
            className="
              flex
              items-center
              justify-between
              rounded-2xl
              bg-[#101010]
              px-3
              py-2
              shadow-[0_0.5px_0_#ffffff10,0_2px_4px_#00000095_inset]
            "
          >
            <span className="text-xs text-white/65">{label}</span>

            <div
              className="
                rounded-xl
                border
                border-white/[0.03]
                bg-gradient-to-b
                from-[#1f1f1f]
                to-[#171717]
                px-2
                py-1
                text-[10px]
                tracking-wide
                text-white
                shadow-[0_0.5px_0px_#ffffff10_inset,0_6px_10px_-8px_#00000090]
              "
            >
              {key}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
