"use client";

import CustomLobby from "@/components/game-ui/Lobby/Custom-Lobby";
import Scene from "@/components/scene/Scene";
import { startPlayroom } from "@/lib/playroom";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [playroomReady, setPlayroomReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    startPlayroom().then(() => {
      setPlayroomReady(true);
    });
  }, []);

  if (!playroomReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-red-600">
        <Loader2 className="mb-4 h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Scene gameStarted={gameStarted} />

      {!gameStarted && <CustomLobby onGameStart={() => setGameStarted(true)} />}
    </main>
  );
}
