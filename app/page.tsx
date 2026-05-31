/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import CustomLobby from "@/components/game-ui/Lobby/Custom-Lobby";
import Scene from "@/components/scene/Scene";
import { Spinner } from "@/components/ui/spinner";
import { startPlayroom } from "@/lib/playroom";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [playroomReady, setPlayroomReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [, setProgress] = useState(0);

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
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-white text-7xl">
        <Spinner className="size-8" />
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
