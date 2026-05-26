"use client";

import { AnimatePresence, motion, Variants } from "framer-motion";
import { ChevronDown, Copy, Lock, Shield, UserPlus, Zap } from "lucide-react";

import Image from "next/image";

import {
  getState,
  isHost,
  onPlayerJoin,
  PlayerState,
  setState,
} from "playroomkit";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomLobbyProps {
  onGameStart: () => void;
}

// ================== ANIMATION VARIANTS ==================

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6 },
  },
};

const sidePanelVariants: Variants = {
  hidden: (direction: "left" | "right") => ({
    opacity: 0,
    x: direction === "left" ? -40 : 40,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 1, 0.5, 1],
      delay: 0.1,
    },
  },
};

const playerSlotVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -10,
    transition: {
      duration: 0.25,
    },
  },
};

const glitchVariants = {
  idle: { x: 0 },
  glitch: {
    x: [0, -3, 3, -2, 2, 0],
    transition: {
      duration: 0.35,
      times: [0, 0.2, 0.4, 0.6, 0.8, 1],
    },
  },
};

// ================== COMPONENT ==================

export default function CustomLobby({ onGameStart }: CustomLobbyProps) {
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [objective, setObjective] = useState<string>("20_kills");
  const [copied, setCopied] = useState(false);
  const [startReady, setStartReady] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);

  const host = isHost();

  useEffect(() => {
    const unsubscribeJoin = onPlayerJoin((player: PlayerState) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === player.id)) return prev;
        return [...prev, player];
      });

      player.onQuit(() => {
        setPlayers((prev) => prev.filter((p) => p.id !== player.id));
      });
    });

    const checkStartInterval = setInterval(() => {
      if (getState("gameStarted")) {
        onGameStart();
      }
    }, 200);

    return () => {
      clearInterval(checkStartInterval);
      unsubscribeJoin();
    };
  }, [onGameStart]);

  const handleStartGame = () => {
    if (!host) return;
    setStartReady(true);
    setTimeout(() => {
      setState("gameObjective", objective);
      setState("gameStarted", true);
      onGameStart();
    }, 400);
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emptySlots = Math.max(0, 4 - players.length);

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      className="
        fixed inset-0 z-50
        flex flex-col
        overflow-y-auto
        bg-[#0f0f0f]
        text-zinc-100
        font-sans
        select-none
        before:absolute before:inset-0
        before:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_40%)]
        before:pointer-events-none
      "
    >
      {/* GRID BG */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e12_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e12_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* RADIAL GLOW */}
      <motion.div
        animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-radial-gradient from-red-900/10 via-blue-900/5 to-transparent pointer-events-none blur-3xl"
      />

      {/* ================= MAIN ================= */}
      <main
        className="
          flex-1 w-full max-w-[1600px] mx-auto
          px-3 sm:px-6 lg:px-8
          py-3 sm:py-5 lg:py-8
          flex flex-col lg:grid lg:grid-cols-12
          gap-3 sm:gap-4 lg:gap-8
          z-10
        "
      >
        {/* ================= LEFT PANEL (collapsible on mobile) ================= */}
        <motion.section
          variants={sidePanelVariants}
          custom="left"
          className="lg:col-span-3 flex flex-col gap-4"
        >
          {/* Mobile: collapsible accordion */}
          <div
            className="
              bg-gradient-to-b from-[#202020] to-[#191919]
              border border-[#2a2a2a]/40
              rounded-2xl
              overflow-hidden
              shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000060]
            "
          >
            {/* Accordion header — always visible, clickable on mobile */}
            <button
              type="button"
              onClick={() => setParamsOpen((v) => !v)}
              className="
                w-full flex items-center justify-between
                px-4 sm:px-5 py-3 sm:py-4
                border-b border-zinc-800/60
                lg:cursor-default
              "
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                  Operation Parametrics
                </h3>
              </div>
              <motion.div
                animate={{ rotate: paramsOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden text-zinc-500"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Panel body */}
            <AnimatePresence initial={false}>
              {/* On lg+, always show. On mobile, toggle. Use a trick: show on lg via CSS, animate on mobile */}
              <motion.div
                key="params-body"
                initial={false}
                animate={{
                  height: paramsOpen ? "auto" : 0,
                }}
                transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                className="overflow-hidden lg:!h-auto"
                style={{ height: undefined }} // let animate control it on mobile
              >
                {/* Workaround: show always on lg */}
                <div className="p-4 sm:p-5 space-y-4 lg:block">
                  {/* Objective */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-zinc-500" />
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
                        Mission Objective
                      </p>
                    </div>

                    {host ? (
                      <div
                        className="
                          relative rounded-xl bg-[#0a0a0a]
                          border border-zinc-900
                          shadow-[0_0.5px_0_#ffffff50,0_2px_6px_#00000090_inset]
                        "
                      >
                        <Select value={objective} onValueChange={setObjective}>
                          <SelectTrigger className="w-full h-11 sm:h-12 px-4 bg-transparent border-0 text-zinc-200 focus:ring-0 focus:ring-offset-0 font-mono text-xs tracking-wide">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border border-[#2d2d2d] text-zinc-200">
                            <SelectItem value="20_kills">
                              DEATHMATCH: 20 ELIMINATIONS
                            </SelectItem>
                            <SelectItem value="survive_2_mins">
                              SURVIVAL: 120 SECONDS
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="relative h-11 sm:h-12 rounded-xl bg-[#0a0a0a] border border-zinc-900 shadow-[0_0.5px_0_#ffffff50,0_2px_6px_#00000090_inset] px-4 flex items-center gap-3 text-zinc-500">
                        <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin shrink-0" />
                        <span className="text-[10px] uppercase tracking-wider font-mono truncate">
                          Host Selecting Directives...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Copy invite — useful on mobile */}
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="
                      w-full h-10 rounded-xl
                      bg-zinc-900 border border-zinc-800
                      text-zinc-400 font-mono text-[11px] uppercase tracking-widest font-bold
                      flex items-center justify-center gap-2
                      hover:bg-zinc-800 hover:text-zinc-200
                      active:scale-95
                      transition-all duration-150
                    "
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied!" : "Copy Invite Link"}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div
            className="
              bg-gradient-to-b from-[#202020] to-[#191919]
              border border-[#2a2a2a]/40
              rounded-2xl p-4 sm:p-5
              flex flex-col gap-4
              shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000060]
            "
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Zap className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                Execution Control
              </h3>
            </div>

            {/* Player count summary */}
            <div className="flex items-center justify-between bg-[#0a0a0a] border border-zinc-900 rounded-xl px-4 py-3 shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Players
              </span>
              <span className="text-sm font-black font-mono text-zinc-200">
                {players.length}
                <span className="text-zinc-600">/4</span>
              </span>
            </div>

            {/* Start button — host only */}
            {host ? (
              <motion.button
                type="button"
                onClick={handleStartGame}
                disabled={startReady || players.length < 1}
                whileHover={!startReady ? { scale: 1.02 } : {}}
                whileTap={!startReady ? { scale: 0.97 } : {}}
                className="
                  relative w-full h-12 sm:h-14 rounded-xl
                  font-mono font-black text-xs sm:text-sm uppercase tracking-[0.2em]
                  overflow-hidden
                  transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-gradient-to-b from-red-600 to-red-700
                  border border-red-500/40
                  text-white
                  shadow-[0_1px_0_#ff000030_inset,0_-1px_0_#00000050_inset,0_4px_20px_rgba(220,38,38,0.3)]
                  hover:shadow-[0_1px_0_#ff000030_inset,0_-1px_0_#00000050_inset,0_4px_30px_rgba(220,38,38,0.5)]
                  flex items-center justify-center gap-2
                "
              >
                {startReady ? "Launching..." : "Begin"}
              </motion.button>
            ) : (
              <div className="w-full h-12 sm:h-14 rounded-xl bg-[#0a0a0a] border border-zinc-900 flex items-center justify-center gap-2 text-zinc-500 font-mono text-[11px] uppercase tracking-wider shadow-[0_0.5px_0_#ffffff20,0_2px_6px_#00000090_inset]">
                <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin shrink-0" />
                Awaiting Host Command
              </div>
            )}
          </div>
        </motion.section>

        {/* ================= CENTER ================= */}
        <section className="lg:col-span-9 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between px-1 sm:px-2">
            <span className="text-sm font-mono bg-zinc-800/50 text-zinc-300 px-2 py-2 rounded-md font-bold border border-zinc-700/50 grow text-center">
              {players.length} / 4 READY
            </span>
          </div>

          {/* Player grid: 1 col on mobile, 2 on sm+ */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  variants={playerSlotVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{ y: -4 }}
                  className="
                    relative flex flex-col justify-between
                    p-3 sm:p-5
                    rounded-2xl
                    bg-gradient-to-b from-[#202020] to-[#191919]
                    border border-[#2b2b2b]/60
                    overflow-hidden group
                    transition-all duration-300
                    shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_4px_6px_-2px_#00000080,0_10px_15px_-3px_#00000050]
                  "
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                      {/* Avatar */}
                      <div
                        className="
                          relative w-12 h-12 sm:w-16 sm:h-16 shrink-0
                          rounded-xl bg-[#0a0a0a]
                          border border-zinc-900
                          shadow-[0_0.5px_0_#ffffff40,0_1px_4px_#000000a0_inset]
                          p-1
                        "
                      >
                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                          <Image
                            src={p.getProfile().photo}
                            alt={p.getProfile().name}
                            fill
                            unoptimized={p
                              .getProfile()
                              .photo.startsWith("data:")}
                            className="object-cover"
                          />
                        </div>
                      </div>

                      {/* Name + ID */}
                      <div className="min-w-0">
                        <h3 className="font-mono font-bold tracking-wide text-zinc-200 text-sm sm:text-base truncate">
                          {p.getProfile().name}
                        </h3>
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800/80 px-1.5 sm:px-2 py-0.5 rounded-md mt-1 inline-block">
                          ID: {p.id.slice(0, 5).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Sync badge */}
                    <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 sm:px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold uppercase tracking-wider hidden sm:inline">
                        SYNC
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-6 pt-3 sm:pt-4 border-t border-zinc-800/70 flex items-center justify-between font-mono">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                      Status Matrix
                    </span>
                    <span className="text-emerald-400 font-bold tracking-widest uppercase text-[10px] sm:text-[11px]">
                      READY
                    </span>
                  </div>
                </motion.div>
              ))}

              {/* EMPTY SLOTS */}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <motion.div
                  key={`empty-${i}`}
                  layout
                  variants={playerSlotVariants}
                  className="
                    relative flex flex-col items-center justify-center
                    p-3 sm:p-5 min-h-[100px] sm:min-h-[140px]
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
                      delay: i * 0.3,
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
              ))}
            </AnimatePresence>
          </div>
        </section>

        
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="relative shrink-0 z-10 border-t border-[#1f1f2e]/60 bg-[#191919]/80 backdrop-blur-xl px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Dead Channel © 2025
        </span>
        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
          Build <span className="text-zinc-500">v0.4.1-alpha</span>
        </span>
      </footer>
    </motion.div>
  );
}
