"use client";

import { KeyboardControls, Loader } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { memo, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import Trees from "@/components/models/Trees";
import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import BorderWalls from "@/components/scene/Border-Walls";
import Environment from "@/components/scene/Environment";
import Ground from "@/components/scene/Ground";
import WeaponSpawner from "@/components/weapons/Weapon-Spawner";

import { useMatchProtection } from "@/hooks/useMatchProtection";
import { Controls } from "@/lib/controls";
import PerformanceStats from "../game-ui/debug/PerformanceStats";
import ActivityLog from "../game-ui/hud/ActivityLog";
import ControlsUI from "../game-ui/hud/Controls-UI";
import Crosshair from "../game-ui/hud/CrossHair";
import BulletSystem from "../weapons/Bullet-System";

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

const MemoizedPerformanceStats = memo(PerformanceStats);
const MemoizedActivityLog = memo(ActivityLog);
const MemoizedControlsUI = memo(ControlsUI);

// ─── Base Global Audio Loop Manager ─────────────────────────────────────────
function GlobalAmbience({ url }: { url: string }) {
  const { camera } = useThree();

  const listenerRef = useRef<THREE.AudioListener | null>(null);
  const soundRef = useRef<THREE.Audio | null>(null);
  const loadedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!listenerRef.current) {
      const listener = new THREE.AudioListener();
      camera.add(listener);
      listenerRef.current = listener;
    }

    if (!soundRef.current && listenerRef.current) {
      soundRef.current = new THREE.Audio(listenerRef.current);
    }

    const sound = soundRef.current;

    if (sound && loadedUrlRef.current !== url) {
      loadedUrlRef.current = url;
      const audioLoader = new THREE.AudioLoader();

      audioLoader.load(
        url,
        (buffer) => {
          if (!soundRef.current) return;

          sound.setBuffer(buffer);
          sound.setLoop(true);
          sound.setVolume(0.3);

          if (!sound.isPlaying) {
            sound.play();
          }
        },
        undefined,
        (err) => console.error("Ambience loading failed:", err),
      );
    }

    return () => {
      if (sound && sound.isPlaying) {
        sound.stop();
      }
      if (listenerRef.current) {
        camera.remove(listenerRef.current);
      }
      listenerRef.current = null;
      soundRef.current = null;
      loadedUrlRef.current = null;
    };
  }, [camera, url]);

  return null;
}

// ─── Memoized Component Allocation ───────────────────────────────────────────
// This tells React: "Unless the 'url' prop strings change, do not touch this."
const MemoizedGlobalAmbience = memo(GlobalAmbience);

export default function Scene({ gameStarted }: SceneProps) {
  const localPlayerRef = useRef<THREE.Group>(null);

  useMatchProtection({
    enabled: gameStarted,
  });

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
      failIfMajorPerformanceCaveat: true,
    }),
    [],
  );

  const cameraOptions = useMemo(
    () => ({
      position: [0, 30, 90] as [number, number, number],
      fov: 60,
      near: 0.8,
      far: 220,
    }),
    [],
  );

  return (
    <div className="w-full h-full select-none overflow-hidden bg-zinc-950">
      <KeyboardControls map={KEYBOARD_MAP}>
        <Canvas
          shadows={false}
          gl={glOptions}
          camera={cameraOptions}
          dpr={[0.5, 0.85]}
          frameloop={gameStarted ? "always" : "demand"}
          performance={{ min: 0.5 }}
        >
          <Suspense fallback={null}>
            <Environment />

            {/* Using the memoized wrapper component */}
            {gameStarted && (
              <MemoizedGlobalAmbience url="/sounds/utils/Ambience.mp3" />
            )}

            <Physics
              gravity={[0, -9.81, 0]}
              colliders={false}
              timeStep={1 / 60}
            >
              <Ground size={300} playerRef={localPlayerRef} />
              <BorderWalls />
              <Trees />

              <PlayerManager active={gameStarted} />
              <WeaponSpawner active={gameStarted} />
              <BulletSystem />
            </Physics>
          </Suspense>
        </Canvas>
        <Crosshair />

        {gameStarted && <MemoizedPerformanceStats />}
        <Loader />
      </KeyboardControls>

      {gameStarted && <MemoizedActivityLog />}
      {gameStarted && <MemoizedControlsUI />}
    </div>
  );
}
