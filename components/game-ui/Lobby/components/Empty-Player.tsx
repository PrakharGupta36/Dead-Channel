"use client";

import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";

import { playerSlotVariants } from "../animations/variants";

interface EmptyPlayerProps {
  index: number;
}

export default function EmptyPlayer({ index }: EmptyPlayerProps) {
  return (
    <motion.div
      layout
      variants={playerSlotVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="
        relative flex flex-col items-center justify-center
        p-3 sm:p-5
        min-h-25 sm:min-h-35
        rounded-2xl

        bg-[#0e0e0e]/40
        border border-dashed border-zinc-800/80

        text-center

        shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]
      "
    >
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          delay: index * 0.3,
        }}
        className="flex flex-col items-center gap-2"
      >
        <div className="p-2 sm:p-3 rounded-full bg-zinc-900/50 border border-zinc-800/50 text-zinc-600">
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-mono font-bold text-zinc-600 block">
            Awaiting Connection
          </span>

          <span className="text-[9px] sm:text-[10px] font-mono text-zinc-700 uppercase tracking-wider">
            Slot Open
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
