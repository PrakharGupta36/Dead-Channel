// app/page.tsx (or pages/index.tsx)
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
    // Initialize Playroom once when the app loads
    startPlayroom().then(() => {
      setPlayroomReady(true);
    });
  }, []);

  if (!playroomReady) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-red-600 font-mono">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="tracking-widest uppercase animate-pulse">
          Establishing Connection...
        </p>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-screen bg-zinc-950">
      <Scene gameStarted={gameStarted} />

      {!gameStarted && <CustomLobby onGameStart={() => setGameStarted(true)} />}
    </main>
  );
}
