"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { PlayerState } from "playroomkit";

import { playerSlotVariants } from "../animations/variants";

interface PlayerCardProps {
  player: PlayerState;
  mine: boolean;
  displayName: string;
  onRename: () => void;
}

export default function PlayerCard({
  player,
  mine,
  displayName,
  onRename,
}: PlayerCardProps) {
  return (
    <motion.div
      layout
      variants={playerSlotVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ y: -4 }}
      className="
        relative flex flex-col justify-between
        p-3 sm:p-5 rounded-2xl
        bg-gradient-to-b from-[#202020] to-[#191919]
        border border-[#2b2b2b]/60 overflow-hidden group
        transition-all duration-300
        shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_4px_6px_-2px_#00000080,0_10px_15px_-3px_#00000050]
      "
      style={mine ? { borderColor: "rgba(239,68,68,0.35)" } : undefined}
    >
      {/* YOU badge */}
      {mine && (
        <div className="absolute top-2.5 right-2.5 text-[9px] font-mono font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
          YOU
        </div>
      )}

      {/* TOP */}
      <div className="flex items-start gap-2 sm:gap-4">
        {/* Avatar */}
        <div
          className="
            relative w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-xl
            bg-[#0a0a0a] border border-zinc-900
            shadow-[0_0.5px_0_#ffffff40,0_1px_4px_#000000a0_inset]
            p-1
          "
        >
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <Image
              src={player.getProfile().photo}
              alt={player.getProfile().name}
              fill
              unoptimized={player.getProfile().photo.startsWith("data:")}
              className="object-cover"
            />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-mono font-bold tracking-wide text-zinc-200 text-sm sm:text-base truncate pr-10">
            {displayName}
          </h3>

          <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800/80 px-1.5 sm:px-2 py-0.5 rounded-md mt-1 inline-block">
            ID: {player.id.slice(0, 5).toUpperCase()}
          </span>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-800/70 flex items-center justify-between gap-2 font-mono">
        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
          Status Matrix
        </span>

        <div className="flex items-center gap-2">
          {mine && (
            <button
              type="button"
              onClick={onRename}
              className="
                h-7 px-2.5 rounded-lg
                bg-zinc-900 border border-zinc-700/60

                font-mono text-[10px] font-bold
                uppercase tracking-widest

                text-zinc-500
                hover:text-red-400
                hover:border-red-500/40

                flex items-center gap-1.5

                transition-all duration-150
                active:scale-95
              "
            >
              <svg
                className="w-2.5 h-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Rename
            </button>
          )}

          <span className="text-emerald-400 font-bold tracking-widest uppercase text-[10px] sm:text-[11px]">
            READY
          </span>
        </div>
      </div>
    </motion.div>
  );
}
