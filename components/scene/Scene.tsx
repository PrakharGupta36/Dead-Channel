/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { KeyboardControls, Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { memo, Suspense, useEffect, useRef } from "react";

import Trees from "@/components/models/Trees";
import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import BorderWalls from "@/components/scene/Border-Walls";
import Environment from "@/components/scene/Environment";
import Ground from "@/components/scene/Ground";
import WeaponSpawner from "@/components/weapons/Weapon-Spawner";

import { Controls } from "@/lib/controls";
import PerformanceStats from "../game-ui/debug/PerformanceStats";

import ControlsUI from "../game-ui/hud/Controls-UI";
import Crosshair from "../game-ui/hud/CrossHair";
import Leaderboard from "../game-ui/hud/Leaderboard";
import BulletSystem from "../weapons/Bullet-System";

import { isHost, useMultiplayerState, usePlayersList } from "playroomkit";
import ActivityLog from "../game-ui/hud/Activity-Log";
import GameOverOverlay from "../game-ui/hud/GameOverOverlay";

interface SceneProps {
  gameStarted: boolean;
}

const KEYBOARD_MAP = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  // { name: Controls.shoot, keys: ["MouseButton0"] },
  // { name: Controls.aim, keys: ["MouseButton2", "KeyI"] },
];

const glOptions = {
  antialias: true,
  powerPreference: "high-performance" as const,
};
const cameraOptions = {
  fov: 45,
  near: 0.1,
  far: 100,
  position: [0, 5, 10] as [number, number, number],
};

const MemoizedPerformanceStats = memo(PerformanceStats);
const MemoizedLeaderboard = memo(Leaderboard);
const MemoizedActivityLog = memo(ActivityLog);
const MemoizedControlsUI = memo(ControlsUI);

export default function Scene({ gameStarted }: SceneProps) {
  const localPlayerRef = useRef<any>(null);
  const loadingActive = false;

  const players = usePlayersList();

  // ── 💡 RE-HOOKED: Listens reactively to the target selected by the host in CustomLobby ──
  const [matchState, setMatchState] = useMultiplayerState(
    "matchState",
    "PLAYING",
  );
  const [winTarget] = useMultiplayerState("winTarget", 20);
  const [winnerName, setWinnerName] = useMultiplayerState("winnerName", "");

  // Host-only match adjudicator
  useEffect(() => {
    if (!isHost() || matchState !== "PLAYING") return;

    const interval = setInterval(() => {
      for (const player of players) {
        const kills = player.getState("kills") ?? 0;
        if (kills >= winTarget) {
          const name =
            player.getState("customName") ??
            player.getProfile().name ??
            "Unknown Player";
          setWinnerName(name);
          setMatchState("ENDED");
          break;
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [players, matchState, winTarget, setMatchState, setWinnerName]);

  return (
    <div className="w-full h-full min-h-screen overflow-hidden bg-zinc-950 relative">
      <div
        className={`w-full h-full transition-opacity duration-500 ${
          loadingActive ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <KeyboardControls map={KEYBOARD_MAP}>
          <Canvas
            shadows={false}
            gl={glOptions}
            camera={cameraOptions}
            dpr={[0.5, 0.85]}
            frameloop={
              gameStarted && matchState === "PLAYING" ? "always" : "demand"
            }
            performance={{ min: 0.5 }}
          >
            <Suspense fallback={null}>
              <Environment />

              <Physics
                gravity={[0, -9.81, 0]}
                colliders={false}
                timeStep={1 / 60}
              >
                <Ground size={300} playerRef={localPlayerRef} />
                <BorderWalls />
                <Trees />

                {matchState === "PLAYING" && (
                  <>
                    <PlayerManager active={gameStarted} />
                    <WeaponSpawner active={gameStarted} />
                  </>
                )}

                <BulletSystem />
              </Physics>
            </Suspense>
          </Canvas>

          {matchState === "PLAYING" && <Crosshair />}

          {gameStarted && matchState === "PLAYING" && (
            <MemoizedPerformanceStats />
          )}
          {gameStarted && matchState === "PLAYING" && <MemoizedLeaderboard />}
        </KeyboardControls>

        {gameStarted && matchState === "PLAYING" && <MemoizedActivityLog />}
        {gameStarted && matchState === "PLAYING" && <MemoizedControlsUI />}
      </div>

      {/* GAME OVER CARD DISPLAY */}
      {matchState === "ENDED" && <GameOverOverlay winnerName={winnerName} />}

      <Loader />
    </div>
  );
}
