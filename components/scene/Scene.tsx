"use client";

import Trees from "@/components/models/Trees";
import BorderWalls from "@/components/scene/BorderWalls";
import Environment from "@/components/scene/Environment";
import Ground from "@/components/scene/Ground";
import { Controls } from "@/lib/controls";
import { KeyboardControls, Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Fragment, useMemo, useRef } from "react";
import * as THREE from "three";

import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import { useMatchProtection } from "@/hooks/useMatchProtection";
import PerformanceStats from "../debug/PerformanceStats";
import ActivityLog from "../game-ui/hud/ActivityLog";
import ControlsUI from "../game-ui/hud/Controls-UI";
import WeaponSpawner from "../weapons/WeaponSpawner";

interface SceneProps {
  gameStarted: boolean;
}

const KEYBOARD_MAP = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.run, keys: ["Shift"] },
];

export default function Scene({ gameStarted }: SceneProps) {
  const localPlayerRef = useRef<THREE.Group>(null);

  const glOptions = useMemo(
    () => ({
      antialias: false, // SMAA handles AA
      powerPreference: "high-performance" as const,
      toneMapping: THREE.ACESFilmicToneMapping, // done on renderer, NOT in composer
      toneMappingExposure: 1.05,
      outputColorSpace: THREE.SRGBColorSpace,
      preserveDrawingBuffer: false,
    }),
    [],
  );

  const cameraOptions = useMemo(
    () => ({
      position: [0, 30, 90] as [number, number, number],
      fov: 65,
      near: 0.1,
      far: 300,
    }),
    [],
  );

  useMatchProtection({
    enabled: true,
  });

  return (
    <div className="w-full h-full select-none overflow-hidden">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas
          shadows="soft"
          gl={glOptions}
          camera={cameraOptions}
          dpr={[0.5, 1]}
          frameloop="always"
        >
          <Environment />

          <Physics gravity={[0, -9.81, 0]} updateLoop="independent">
            <Ground visibleRadius={60} size={200} playerRef={localPlayerRef} />
            <BorderWalls />
            <Trees />
            <PlayerManager active={gameStarted} />
            <WeaponSpawner active={gameStarted} />
          </Physics>
        </Canvas>

        {gameStarted && <PerformanceStats />}
        <Loader />
      </KeyboardControls>

      {gameStarted && (
        <Fragment>
          <ActivityLog />
        </Fragment>
      )}

      {gameStarted && <ControlsUI />}
    </div>
  );
}
