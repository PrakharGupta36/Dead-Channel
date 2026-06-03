"use client";

import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { myPlayer, usePlayersList } from "playroomkit";

export default function Leaderboard() {
  const players = usePlayersList();
  const isMyPlayer = myPlayer();

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
      className="fixed right-0 top-3 z-[9999] pointer-events-none scale-80"
    >
      <Card
        className="
          border-none rounded-2xl
          bg-gradient-to-b from-[#202020] to-[#191919]
          px-4 py-3 text-white backdrop-blur-xl
          shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000060,0_0px_6px_0px_#00000060]
        "
      >
        <div className="flex flex-col gap-2 font-mono">
       

          {/* Player rows */}
          {sortedPlayers.map((player, index) => {
            const profile = player.getProfile();
            const kills = player.getState("kills") ?? 0;
            const health = player.getState("health") ?? 100;
            const isDead = health <= 0;
            const isYou = player.id === isMyPlayer?.id;
            const isFirst = index === 0;

         

            return (
              <div
                key={player.id}
                className="flex items-center justify-between gap-6 rounded-xl bg-[#111111] px-3 py-2 shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]"
                style={{
                  background: isFirst
                    ? "linear-gradient(to bottom, #2a2318, #1e1a10)"
                    : "linear-gradient(to bottom, #1a1a1a, #141414)",
                  boxShadow: isFirst
                    ? "0 0.5px 0 #ffcc5520 inset, 0 1px 1.5px #ffcc5525 inset, 0 4px 8px -4px #00000070, 0 0 4px #00000060"
                    : "0 0.5px 0 #ffffff12 inset, 0 1px 1.5px #ffffff1a inset, 0 4px 8px -4px #00000060, 0 0 3px #00000050",
                  opacity: isDead ? 0.5 : 1,
                }}
              >
                

                {/* Name */}
                <span
                  className="flex-1 truncate text-xs"
                  style={{
                    color: isFirst
                      ? "#ffe08a"
                      : isDead
                        ? "#ffffff30"
                        : "#ffffffc0",
                  }}
                >
                  {profile.name ?? "Player"}
                </span>

                {/* YOU / DEAD tag */}
                {isYou && (
                  <span className="text-xs tracking-widest text-white/30   rounded px-1 py-px flex-shrink-0">
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
                    className="text-xs"
                    style={{
                      color: isFirst
                        ? "#fbbf24"
                        : isDead
                          ? "#ffffff20"
                          : "#4ade80",
                    }}
                  >
                    {kills}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}
