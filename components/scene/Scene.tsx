"use client";

import { useMemo, useRef, memo, Suspense } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { KeyboardControls, Loader } from "@react-three/drei";

import Trees from "@/components/models/Trees";
import BorderWalls from "@/components/scene/BorderWalls";
import Environment from "@/components/scene/Environment";
import Ground from "@/components/scene/Ground";
import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import WeaponSpawner from "@/components/weapons/WeaponSpawner";

import { Controls } from "@/lib/controls";
import { useMatchProtection } from "@/hooks/useMatchProtection";
import PerformanceStats from "../debug/PerformanceStats";
import ActivityLog from "../game-ui/hud/ActivityLog";
import ControlsUI from "../game-ui/hud/Controls-UI";

interface SceneProps {
  gameStarted: boolean;
}

// 1. Move static maps completely outside the component to prevent re-creation
const KEYBOARD_MAP = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.run, keys: ["Shift"] },
];

// 2. Memoize UI components so they don't re-render on every frame update or state tick
const MemoizedPerformanceStats = memo(PerformanceStats);
const MemoizedActivityLog = memo(ActivityLog);
const MemoizedControlsUI = memo(ControlsUI);

export default function Scene({ gameStarted }: SceneProps) {
  const localPlayerRef = useRef<THREE.Group>(null);

  // Opt-in to match protection hook
  useMatchProtection({
    enabled: gameStarted,
  });

  // 3. Ultra-optimized WebGL settings for low-end hardware
  const glOptions = useMemo(
    () => ({
      antialias: false,
      powerPreference: "high-performance" as const,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.05,
      outputColorSpace: THREE.SRGBColorSpace,
      preserveDrawingBuffer: false,
      stencil: false, // Off: Saves memory buffer allocations
      depth: true,
      alpha: false, // Off: Background is fully opaque, saves blending calculations
      failIfMajorPerformanceCaveat: false,
    }),
    [],
  );

  const cameraOptions = useMemo(
    () => ({
      position: [0, 30, 90] as [number, number, number],
      fov: 60,
      near: 0.5,
      far: 250, // 1. INCREASED: Restores visibility to large ground maps
    }),
    [],
  );

  return (
    <div className="w-full h-full select-none overflow-hidden bg-zinc-950">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas
          shadows={false} // 4. SHADOWS ARE THE #1 KILLER: Hard disabled "soft" shadows for low-end rigs
          gl={glOptions}
          camera={cameraOptions}
          dpr={[0.5, 1]} // Excellent configuration for capping mobile/low-end scaling
          frameloop={gameStarted ? "always" : "demand"} // 5. Only render frames continuously when the game is active
          performance={{ min: 0.5 }} // Allows R3F to automatically scale down settings if frames drop
        >
          {/* 6. Wrapped assets in Suspense to prevent rendering stalls */}
          <Suspense fallback={null}>
            <Environment />

            {/* 7. Optimizing Rapier step timing */}
            <Physics
              gravity={[0, -9.81, 0]}
              updateLoop="independent"
              timeStep="vary" 
            >
              <Ground
                visibleRadius={45}
                size={150}
                playerRef={localPlayerRef}
              />{" "}
              {/* Reduced radiuses for performance */}
              <BorderWalls />
              <Trees />
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
