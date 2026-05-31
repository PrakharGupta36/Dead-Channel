"use client";

import { KeyboardControls, Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { memo, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import Trees from "@/components/models/Trees";
import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import BorderWalls from "@/components/scene/Border-Walls";
import Environment from "@/components/scene/Environment";
import Ground from "@/components/scene/Ground";
import WeaponSpawner from "@/components/weapons/WeaponSpawner";

import { useMatchProtection } from "@/hooks/useMatchProtection";
import { Controls } from "@/lib/controls";
import PerformanceStats from "../game-ui/debug/PerformanceStats";
import ActivityLog from "../game-ui/hud/ActivityLog";
import ControlsUI from "../game-ui/hud/Controls-UI";

interface SceneProps {
  gameStarted: boolean;
}

// Global static keyboard map configuration block allocation (Outside React reconciler)
const KEYBOARD_MAP = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.run, keys: ["Shift"] },
];

// Memoized UI layout fragments preventing main thread JS render cycle blocking
const MemoizedPerformanceStats = memo(PerformanceStats);
const MemoizedActivityLog = memo(ActivityLog);
const MemoizedControlsUI = memo(ControlsUI);

export default function Scene({ gameStarted }: SceneProps) {
  const localPlayerRef = useRef<THREE.Group>(null);

  // Opt-in to match protection hook
  useMatchProtection({
    enabled: gameStarted,
  });

  // 1. Production-Grade WebGL Context Config Allocations
  const glOptions = useMemo(
    () => ({
      antialias: false,
      powerPreference: "high-performance" as const,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
      outputColorSpace: THREE.SRGBColorSpace,
      preserveDrawingBuffer: false,
      stencil: false,
      depth: true,
      alpha: false,
      failIfMajorPerformanceCaveat: true, // Fail early on broken drivers to let grace fallbacks catch errors
    }),
    [],
  );

  // 2. High-speed viewing frustum bounding allocations
  const cameraOptions = useMemo(
    () => ({
      position: [0, 30, 90] as [number, number, number],
      fov: 60,
      near: 0.8, // Raised from 0.5 to discard ultra-close micro fragments early
      far: 220, // Pulled back slightly from 250 to shrink active matrix clipping arrays
    }),
    [],
  );

  return (
    <div className="w-full h-full select-none overflow-hidden bg-zinc-950">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas
          shadows={false} // Hard disabled: Saves massive GPU rendering overhead
          gl={glOptions}
          camera={cameraOptions}
          dpr={[0.5, 0.85]} // Capped upper limit at 0.85 for stable retina screen performance
          frameloop={gameStarted ? "always" : "demand"}
          performance={{ min: 0.5 }}
        >
          <Suspense fallback={null}>
            <Environment />

            {/* 3. CRITICAL PHYSICS LOOP REMAP:
              - Swapped 'independent' loop execution to standard frame synchronization.
              - Set timeStep to fixed '60fps' lock to eliminate processing spikes on low-end CPUs.
            */}
            <Physics
              gravity={[0, -9.81, 0]}
              colliders={false}
              timeStep={1 / 60}
            >
              <Ground size={300} playerRef={localPlayerRef}  />
              <BorderWalls />
              <Trees />

              {/* Keep network client states mounted but sleep updates until matching engine fires */}
              <PlayerManager active={gameStarted} />
              <WeaponSpawner active={gameStarted} />
            </Physics>
          </Suspense>
        </Canvas>

        {gameStarted && <MemoizedPerformanceStats />}
        <Loader />
      </KeyboardControls>

      {gameStarted && <MemoizedActivityLog />}
      {gameStarted && <MemoizedControlsUI />}
    </div>
  );
}
