"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Copy, Lock, Shield } from "lucide-react";
import { isHost, setState, useMultiplayerState } from "playroomkit";
import { useEffect, useMemo, useCallback } from "react";
import { sidePanelVariants } from "../animations/variants";

interface LeftPanelProps {
  paramsOpen: boolean;
  setParamsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  copied: boolean;
  objective: string;
  setObjective: React.Dispatch<React.SetStateAction<string>>;
  copyInviteLink: () => void;
}

export default function LeftPanel({
  paramsOpen,
  setParamsOpen,
  copied,
  objective,
  setObjective,
  copyInviteLink,
}: LeftPanelProps) {
  // 1. Memoize host check to eliminate overhead across render frames
  const host = useMemo(() => isHost(), []);

  // ── 💡 MULTIPLAYER REFLEXES FOR SYNCED MODES ───────────────────────────
  const [syncedMode, setSyncedMode] = useMultiplayerState(
    "gameMode",
    "deathmatch",
  );

  // Set default fallback specifically to 5 here
  const [syncedTarget, setSyncedTarget] = useMultiplayerState("winTarget", 5);

  // Keep local lobby state synchronized with multiplayer state updates cleanly
  useEffect(() => {
    if (syncedMode === "deathmatch") {
      const currentTarget = syncedTarget ?? 5; // Absolute guard rail fallback
      setObjective(`${currentTarget}_kills`);
    }
  }, [syncedMode, syncedTarget, setObjective]);

  // 2. Wrap status handlers in useCallback to protect functional referential identities
  const handleModeChange = useCallback(
    (mode: string) => {
      if (!host) return;
      setSyncedMode(mode);
      if (mode === "deathmatch") {
        setState("gameMode", "deathmatch");
      }
    },
    [host, setSyncedMode],
  );

  const handleTargetChange = useCallback(
    (targetValue: string) => {
      if (!host) return;
      const numericKills = parseInt(targetValue, 10) || 5; // Default to 5 if parse fails
      setSyncedTarget(numericKills);
      setState("winTarget", numericKills);
      setObjective(`${numericKills}_kills`);
    },
    [host, setSyncedTarget, setObjective],
  );

  return (
    <motion.section
      variants={sidePanelVariants}
      custom="left"
      className="lg:col-span-3 flex flex-col gap-4"
    >
      <div
        className="
          bg-linear-to-b from-[#202020] to-[#191919]
          border border-[#2a2a2a]/40 rounded-2xl overflow-hidden
          shadow-[0_1px_0.5px_#ffffff1a_inset,0_1px_1px_#ffffff35_inset,0_10px_10px_-9px_#00000070,0_20px_20px_-14px_#00000060]
        "
      >
        <button
          type="button"
          onClick={() => setParamsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-800/60 lg:cursor-default"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
              Match Info
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

        <AnimatePresence initial={false}>
          <motion.div
            key="params-body"
            initial={false}
            animate={{ height: paramsOpen ? "auto" : 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden lg:h-auto!"
          >
            <div className="p-4 sm:p-5 space-y-4 lg:block">
              {/* SELECT COMPONENT 1: GAME OPERATION SELECTION */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
                    Game Mode Directive
                  </p>
                </div>
                {host ? (
                  <div className="relative rounded-xl bg-[#0a0a0a] border border-zinc-900 shadow-[0_0.5px_0_#ffffff50,0_2px_6px_#00000090_inset]">
                    <Select value={syncedMode} onValueChange={handleModeChange}>
                      <SelectTrigger className="w-full h-11 sm:h-12 px-4 bg-transparent border-0 text-zinc-200 focus:ring-0 focus:ring-offset-0 font-mono text-xs tracking-wide">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border border-[#2d2d2d] text-zinc-200">
                        <SelectItem value="deathmatch">
                          KILL COUNT: DEATHMATCH
                        </SelectItem>
                        <SelectItem value="infected" disabled>
                          INFECTED (COMING SOON)
                        </SelectItem>
                        <SelectItem value="extraction" disabled>
                          EXTRACTION (COMING SOON)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="relative h-11 sm:h-12 rounded-xl bg-[#0a0a0a] border border-zinc-900 shadow-[0_0.5px_0_#ffffff50,0_2px_6px_#00000090_inset] px-4 flex items-center gap-3 text-zinc-400">
                    <span className="text-[11px] font-mono tracking-wide uppercase truncate">
                      MODE: {syncedMode.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* SELECT COMPONENT 2: TARGET THRESHOLD CONDITIONER */}
              {syncedMode === "deathmatch" && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono font-semibold">
                      Elimination Win Target
                    </p>
                  </div>
                  {host ? (
                    <div className="relative rounded-xl bg-[#0a0a0a] border border-zinc-900 shadow-[0_0.5px_0_#ffffff50,0_2px_6px_#00000090_inset]">
                      <Select
                        value={String(syncedTarget ?? 5)}
                        onValueChange={handleTargetChange}
                      >
                        <SelectTrigger className="w-full h-11 sm:h-12 px-4 bg-transparent border-0 text-zinc-200 focus:ring-0 focus:ring-offset-0 font-mono text-xs tracking-wide">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border border-[#2d2d2d] text-zinc-200">
                          {[5, 10, 15, 20, 25, 30].map((kills) => (
                            <SelectItem key={kills} value={String(kills)}>
                              {kills} ELIMINATIONS
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="relative h-11 sm:h-12 rounded-xl bg-[#0a0a0a] border border-zinc-900 shadow-[0_0.5px_0_#ffffff50,0_2px_6px_#00000090_inset] px-4 flex items-center gap-3 text-zinc-400">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      <span className="text-[11px] uppercase tracking-wider font-mono truncate">
                        TARGET: {syncedTarget ?? 5} KILLS
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={copyInviteLink}
                className="
                  w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800
                  text-zinc-400 font-mono text-[11px] uppercase tracking-widest font-bold
                  flex items-center justify-center gap-2
                  hover:bg-zinc-800 hover:text-zinc-200
                  active:scale-95 transition-all duration-150
                "
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy Invite Link"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
