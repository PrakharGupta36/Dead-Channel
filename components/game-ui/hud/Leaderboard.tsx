/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { myPlayer, usePlayersList, usePlayerState } from "playroomkit";

// Dedicated row component so usePlayerState can hook into each player individually
function LeaderboardRow({
  player,
  index,
  isYou,
}: {
  player: any;
  index: number;
  isYou: boolean;
}) {
  const [kills] = usePlayerState(player, "kills", 0);
  const [health] = usePlayerState(player, "health", 100);
  // ── Hooking into customName state ──────────────────────────────
  const [customName] = usePlayerState(player, "customName", null);

  const profile = player.getProfile();
  const isDead = health <= 0;
  const isFirst = index === 0;

  // Use customName first, fallback to profile name, and finally "Player"
  const displayName = customName ?? profile.name ?? "Player";

  return (
    <div
      className="flex items-center justify-between gap-6 rounded-xl px-3 py-2 transition-all duration-300"
      style={{
        background: "linear-gradient(to bottom, #1a1a1a, #141414)",
        boxShadow:
          "0 0.5px 0 #ffffff12 inset, 0 1px 1.5px #ffffff1a inset, 0 4px 8px -4px #00000060, 0 0 3px #00000050",
        opacity: isDead ? 0.5 : 1,
      }}
    >
      {/* Name */}
      <span
        className="flex-1 truncate text-xs"
        style={{
          color: isFirst ? "#ffe08a" : isDead ? "#ffffff30" : "#ffffffc0",
        }}
      >
        {displayName}
      </span>

      {/* YOU / DEAD tag */}
      {isYou && (
        <span className="text-xs tracking-widest text-white/30 rounded px-1 py-px flex-shrink-0">
          (YOU)
        </span>
      )}
      {!isYou && isDead && (
        <span className="text-xs tracking-widest text-red-500/40 rounded px-1 py-px flex-shrink-0">
          DEAD
        </span>
      )}

      {/* Kill count — inset well */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          minWidth: "32px",
          height: "22px",
          borderRadius: "5px",
          background: "#0d0d0d",
          boxShadow: "0 0.5px 0 #ffffff40, 0 2px 6px #00000095 inset",
        }}
      >
        <span
          className="text-xs font-bold"
          style={{
            color: isDead ? "#ffffff20" : "#4ade80",
          }}
        >
          {kills}
        </span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  // usePlayersList automatically handles re-renders when a player joins/leaves
  const players = usePlayersList();
  const isMyPlayer = myPlayer();

  // Sort players using their instant Playroom state snapshots
  const sortedPlayers = [...players].sort((a, b) => {
    const killsA = a.getState("kills") ?? 0;
    const killsB = b.getState("kills") ?? 0;
    return killsB - killsA;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed right-0 top-0 z-[9999] pointer-events-none scale-80"
    >
      <Card
        className="
          border-none rounded-2xl
          bg-gradient-to-b from-[#202020] to-[#191919]
          px-4 py-3 text-white backdrop-blur-xl
          shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000060,0_0px_6px_0px_#00000060]
        "
      >
        {/* Added a small title to match the UI aesthetic */}
        <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mb-2 px-1">
          Kills
        </div>

        <div className="flex flex-col gap-2 font-mono min-w-[200px]">
          {sortedPlayers.map((player, index) => (
            <LeaderboardRow
              key={player.id}
              player={player}
              index={index}
              isYou={player.id === isMyPlayer?.id}
            />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
