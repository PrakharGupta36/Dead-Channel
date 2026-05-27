"use client";

import { onPlayerJoin, PlayerState } from "playroomkit";
import { useEffect, useRef, useState } from "react";

interface LogMessage {
  id: string;
  text: string;
  type: "join" | "leave";
  timestamp: string;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const activePlayersRef = useRef<Set<string>>(new Set());

  const addLog = (text: string, type: "join" | "leave") => {
    const id = Math.random().toString(36).substring(2, 9);
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    setLogs((prev) => [...prev, { id, text, type, timestamp }]);

    setTimeout(() => {
      setLogs((prev) => prev.filter((log) => log.id !== id));
    }, 4500);
  };

  useEffect(() => {
    const joinUnsubscribe = onPlayerJoin((player: PlayerState) => {
      const playerId = player.id;

      // Prefer customName set in lobby, fall back to profile name
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
          // Re-resolve at quit time too, in case name changed mid-session
          addLog(`${resolveName().toUpperCase()} DISCONNECTED`, "leave");
        }
      });
    });

    return () => {
      if (typeof joinUnsubscribe === "function") joinUnsubscribe();
      activePlayersRef.current.clear();
    };
  }, []);

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-3 w-80 pointer-events-none select-none">
      {logs.map((log) => (
        <div
          key={log.id}
          className="
            w-full transform animate-slide-in p-2 rounded-lg 
            bg-gradient-to-b from-[#202020] to-[#191919]
            shadow-[0_0.5px_0px_#ffffff1a_inset,0_1px_0.5px_#ffffff25_inset,0_10px_10px_-9px_#00000090,0_20px_20px_-14px_#00000080,0_0px_6px_0px_#00000090]
            flex items-center gap-2.5 border border-black/40
          "
        >
          <div
            className="
              h-7 w-7 rounded-md bg-[#0a0a0a] flex items-center justify-center
              shadow-[0_0.5px_0_#ffffff15,0_2px_4px_#000000c0_inset]
            "
          >
            <div
              className={`
                h-2.5 w-2.5 rounded-full transition-all duration-300
                ${
                  log.type === "join"
                    ? "bg-emerald-400 shadow-[0_0_8px_#10b981,inset_0_1px_1px_#ffffff80]"
                    : "bg-rose-500 shadow-[0_0_8px_#f43f5e,inset_0_1px_1px_#ffffff80]"
                }
              `}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#8a8a8a] leading-none mb-1">
              SYSTEM ACTIVITY
            </span>
            <span className="text-xs font-mono font-bold tracking-wide text-[#e0e0e0] truncate leading-none">
              {log.text}
            </span>
          </div>

          <div
            className="
              px-2 h-7 rounded-md bg-[#0f0f0f] flex items-center justify-center border-t border-black/50
              shadow-[0_0.5px_0_#ffffff10,0_1.5px_3px_#000000e0_inset]
            "
          >
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#555555]">
              {log.timestamp}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
