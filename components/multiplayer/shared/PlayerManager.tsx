"use client";

import { myPlayer, usePlayersList } from "playroomkit";

import LocalPlayer from "../LocalPlayer";
import RemotePlayer from "../RemotePlayer";

export default function PlayerManager() {
  // usePlayersList(true) triggers re-render when the list changes
  const players = usePlayersList(true);

  const currentPlayer = myPlayer();

  return (
    <>
      {/* LOCAL — always rendered once, guards internally */}
      <LocalPlayer />

      {/* REMOTES — everyone except the local player */}
      {currentPlayer &&
        players
          .filter((player) => player.id !== currentPlayer.id)
          .map((player) => <RemotePlayer key={player.id} player={player} />)}
    </>
  );
}
