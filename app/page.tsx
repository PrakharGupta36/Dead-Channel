"use client";

import { startPlayroom } from "@/lib/playroom";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";

// 1. Dynamic import with SSR disabled keeps Three.js/WebGL code out of the initial server bundle
const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
  loading: () => null,
});

const CustomLobby = dynamic(() => import("@/components/game-ui/Custom-Lobby"), {
  ssr: false,
});

export default function Home() {
  const [playroomReady, setPlayroomReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    // Fire and forget asset pre-fetching could also be triggered here if available
    startPlayroom().then(() => {
      if (isMounted) setPlayroomReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Optimized State Transition Handler to avoid blocking the main thread
  const handleGameStart = () => {
    startTransition(() => {
      setGameStarted(true);
    });
  };

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
    <main className="relative w-screen h-screen bg-zinc-950 overflow-hidden select-none touch-none">
      {/* Scene sits persistently; we pass gameStarted but ensure it's built to handle updates gracefully */}
      <Scene gameStarted={gameStarted} />

      {/* Unmount explicitly using logical gates to completely drop DOM memory weights */}
      {!gameStarted && (
        <CustomLobby key="lobby-overlay" onGameStart={handleGameStart} />
      )}
    </main>
  );
}
