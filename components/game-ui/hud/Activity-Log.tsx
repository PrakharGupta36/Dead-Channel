/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { onPlayerJoin, PlayerState, RPC } from "playroomkit";
import { useEffect, useRef, useState } from "react";

interface LogMessage {
  id: string;
  text: string;
  type: "join" | "leave" | "kill";
  timestamp: string;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const activePlayersRef = useRef<Set<string>>(new Set());

  // ── Keep track of handled kill transaction tokens ── //
  const processedKillsRef = useRef<Set<string>>(new Set());

  const addLog = (
    text: string,
    type: "join" | "leave" | "kill",
    explicitId?: string,
  ) => {
    const id = explicitId ?? Math.random().toString(36).substring(2, 9);
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    setLogs((prev) => [...prev, { id, text, type, timestamp }]);

    setTimeout(() => {
      setLogs((prev) => prev.filter((log) => log.id !== id));
      if (type === "kill" && explicitId) {
        processedKillsRef.current.delete(explicitId);
      }
    }, 4500);
  };

  useEffect(() => {
    RPC.register("player_kill_event", async (data: any) => {
      const { killId, shooterName, targetName } = data;

      // ─- If this specific bullet transaction was already processed, drop it ── //
      if (killId && processedKillsRef.current.has(killId)) return;
      if (killId) processedKillsRef.current.add(killId);

      addLog(
        `${shooterName.toUpperCase()} KNOCKED ${targetName.toUpperCase()}`,
        "kill",
        killId,
      );
    });

    const joinUnsubscribe = onPlayerJoin((player: PlayerState) => {
      const playerId = player.id;

      const resolveName = () =>
        (player.getState("customName") as string | undefined) ??
        player.getProfile().name ??
        "Unknown";

      if (activePlayersRef.current.has(playerId)) return;

      activePlayersRef.current.add(playerId);
      addLog(`${resolveName().toUpperCase()} ACCESSED`, "join");

      player.onQuit(() => {
        if (activePlayersRef.current.has(playerId)) {
          activePlayersRef.current.delete(playerId);
          addLog(`${resolveName().toUpperCase()} DISCONNECTED`, "leave");
        }
      });
    });

    return () => {
      if (typeof joinUnsubscribe === "function") joinUnsubscribe();
      activePlayersRef.current.clear();
      processedKillsRef.current.clear();
    };
  }, []);

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-96 pointer-events-none select-none mb-10"
      style={{
        scale: "90%",
      }}
    >
      {logs.map((log) => (
        <div
          key={log.id}
          className="
            w-[100%] transform animate-slide-in p-3 rounded-lg 
            bg-gradient-to-b from-[#202020] to-[#191919]
            shadow-[0_0.5px_0px_#ffffff1a_inset,0_1px_0.5px_#ffffff25_inset,0_10px_10px_-9px_#00000090,0_20px_20px_-14px_#00000080,0_0px_6px_0px_#00000090]
            flex items-center gap-2.5 border border-black/40 
          "
          style={{
            position: "relative",
            top: "-10px",
          }}
        >
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-xs font-mono font-bold tracking-wide text-[#e0e0e0] truncate leading-none">
              {log.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
