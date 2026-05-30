"use client";

import CustomLobby from "@/components/game-ui/Lobby/Custom-Lobby";
import Scene from "@/components/scene/Scene";
import { startPlayroom } from "@/lib/playroom";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [playroomReady, setPlayroomReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Keep track of timeout/interval IDs to prevent memory leaks on unmount
  const timersRef = useRef<{
    interval?: NodeJS.Timeout;
    timeout?: NodeJS.Timeout;
  }>({});

  useEffect(() => {
    // 1. Simulated progress increment
    timersRef.current.interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timersRef.current.interval);
          return 90;
        }
        return prev + Math.floor(Math.random() * 10) + 5;
      });
    }, 150);

    // 2. Actual Playroom Initialization
    startPlayroom()
      .then(() => {
        clearInterval(timersRef.current.interval);
        setProgress(100);

        // Brief delay so the user catches the 100% completion
        timersRef.current.timeout = setTimeout(() => {
          setPlayroomReady(true);
        }, 400);
      })
      .catch((error) => {
        console.error("Failed to initialize Playroom:", error);
        clearInterval(timersRef.current.interval);
      });

    // Cleanup everything on unmount
    return () => {
      clearInterval(timersRef.current.interval);
      clearTimeout(timersRef.current.timeout);
    };
  }, []);

  // Display Loading Screen
  if (!playroomReady) {
    // Clamped progress value for styling and text
    const displayProgress = Math.min(progress, 100);

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-12 font-mono text-white">
        <div className="mx-9 w-[95%] max-w-xl space-y-4">
          {/* Status text & Percentage */}
          <div className="flex justify-between text-sm uppercase tracking-widest text-zinc-400">
            <span>Initializing Game...</span>
            <span className="font-bold text-red-500">{displayProgress}%</span>
          </div>

          {/* Track */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            {/* Fill Bar */}
            <div
              className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Display Game
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Scene gameStarted={gameStarted} />
      {!gameStarted && <CustomLobby onGameStart={() => setGameStarted(true)} />}
    </main>
  );
}
