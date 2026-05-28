/* eslint-disable @typescript-eslint/no-require-imports */
import { PlayerState } from "playroomkit";
import { useEffect, useState } from "react";

export function useRealTimePlayers() {
  const [players, setPlayers] = useState<PlayerState[]>([]);

  useEffect(() => {
    // Import dynamically or get from core package safely
    const { onPlayerJoin } = require("playroomkit");

    const activePlayers = new Map<string, PlayerState>();

    const unsubscribe = onPlayerJoin((player: PlayerState) => {
      activePlayers.set(player.id, player);
      setPlayers(Array.from(activePlayers.values()));

      // Listen to deep network state updates (like callsign overrides) for this specific player
      player.onQuit(() => {
        activePlayers.delete(player.id);
        setPlayers(Array.from(activePlayers.values()));
      });
    });

    const { onSync } = require("playroomkit");
    let unsubscribeSync: () => void = () => {};

    try {
      unsubscribeSync = onSync(() => {
        setPlayers(Array.from(activePlayers.values()));
      });
    } catch (e) {
      const interval = setInterval(() => {
        setPlayers(Array.from(activePlayers.values()));
      }, 300);
      unsubscribeSync = () => clearInterval(interval);
    }

    return () => {
      unsubscribe();
      unsubscribeSync();
    };
  }, []);

  return players;
}
