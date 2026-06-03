"use client";

import { myPlayer, usePlayersList } from "playroomkit";
import { useMemo } from "react";
import LocalPlayer from "../LocalPlayer";
import RemotePlayer from "../RemotePlayer";

interface PlayerManagerProps {
  active: boolean;
}

export default function PlayerManager({ active }: PlayerManagerProps) {
  // Triggers re-render ONLY when players join or leave the room instance
  const players = usePlayersList(true);
  const currentPlayer = myPlayer();

  const remotePlayers = useMemo(() => {
    if (!currentPlayer) return [];

    return players.filter((player) => player.id !== currentPlayer.id);
  }, [players, currentPlayer]);

  if (!active || !currentPlayer) return null;

  return (
    <>
      <LocalPlayer />

      {remotePlayers.map((player) => (
        <RemotePlayer key={player.id} player={player} />
      ))}
    </>
  );
}
