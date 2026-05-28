// components/ui/StartButton.tsx
"use client";

import { motion } from "framer-motion";

interface StartButtonProps {
  host: boolean;
  startReady: boolean;
  playersCount: number;
  onStart: () => void;
}

export default function StartButton({
  host,
  startReady,
  playersCount,
  onStart,
}: StartButtonProps) {
  if (!host) {
    return (
      <div
        className="
          relative w-full h-12 sm:h-14 rounded-2xl
          overflow-hidden

          bg-linear-to-b
          from-[#1f1f1f]
          via-[#121212]
          to-[#090909]

          border border-[#2a2a2a]

          flex items-center justify-center gap-2

          text-zinc-500
          font-mono text-[11px]
          uppercase tracking-[0.18em]

          shadow-[0_2px_0_#3a3a3a_inset,0_-4px_8px_#000000_inset,0_8px_20px_rgba(0,0,0,0.5)]

          before:absolute before:inset-px
          before:rounded-[15px]
          before:bg-linear-to-b
          before:from-white/4
          before:to-transparent
          before:pointer-events-none
        "
      >
        <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin shrink-0" />

        <span className="relative z-10">Awaiting Host Command</span>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onStart}
      disabled={startReady || playersCount < 1}
      whileHover={!startReady ? { scale: 1.015, y: -1 } : {}}
      whileTap={!startReady ? { scale: 0.985, y: 2 } : {}}
      className="
        relative w-full h-12 sm:h-14 rounded-2xl
        overflow-hidden

        font-mono font-black
        text-xs sm:text-sm
        uppercase tracking-[0.22em]
        text-zinc-100

        bg-linear-to-b
        from-[#2d2d2d]
        via-[#1c1c1c]
        to-[#0d0d0d]

        border border-[#3a3a3a]

        shadow-[0_2px_0_#5a5a5a_inset,0_-4px_8px_#000000_inset,0_10px_25px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.06)]

        transition-all duration-200

        disabled:opacity-40
        disabled:cursor-not-allowed

        before:absolute before:inset-px
        before:rounded-[15px]
        before:bg-linear-to-b
        before:from-white/8
        before:to-transparent
        before:pointer-events-none

        after:absolute after:left-0 after:top-0
        after:h-1/2 after:w-full
        after:bg-linear-to-b
        after:from-white/8
        after:to-transparent
        after:pointer-events-none

        hover:brightness-110
        hover:shadow-[0_2px_0_#6a6a6a_inset,0_-4px_10px_#000000_inset,0_14px_30px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.08)]
      "
    >
      {/* subtle red ambient glow */}
      <div className="absolute inset-0 bg-red-500/3" />

    

      {/* content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />

        {startReady ? "Launching..." : "Begin"}
      </div>
    </motion.button>
  );
}
