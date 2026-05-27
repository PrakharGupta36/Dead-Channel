// components/scene/Scene.tsx
"use client";

import HUD from "@/components/hud/HUD";
import BorderWalls from "@/components/scene/BorderWalls";
import Ground from "@/components/scene/Ground";
import Lights from "@/components/scene/Lights";
import Trees from "@/components/scene/Trees";
import { Controls } from "@/lib/controls";
import { KeyboardControls, Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";

import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import PerformanceStats from "../debug/PerformanceStats";
import ActivityLog from "../hud/ActivityLog";
import WeaponSpawner from "../weapons/WeaponSpawner";

interface SceneProps {
  gameStarted: boolean;
}

export default function Scene({ gameStarted }: SceneProps) {
  return (
    <div className="w-full h-full select-none">
      <KeyboardControls
        map={[
          { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
          { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
          { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
          { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
          { name: Controls.jump, keys: ["Space"] },
          { name: Controls.run, keys: ["Shift"] },
        ]}
      >
        <Canvas
          shadows="soft" // Smooth shadow filtering with less overhead
          gl={{
            antialias: false, // PERFORMANCE BOOST: Disable MSAA if you are rendering high-res low-poly layouts
            powerPreference: "high-performance", // Hints the browser to force dedicated GPU usage
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          camera={{ position: [0, 30, 60], fov: 45 }}
        >
          {/* Manages all environmental ambient, sun shadows, and horizon fog colors */}
          <Lights />

          {/* FIXED: Removed the second, redundant directionalLight from here entirely */}

          {/* PERFORMANCE BOOST: Locked timestep and enabled interpolation 
              to eliminate physics stuttering during heavy frames */}
          <Physics gravity={[0, -9.81, 0]} updateLoop="independent">
            <Ground />
            <BorderWalls />
            <Trees />

            {gameStarted && (
              <>
                <PlayerManager />
                <WeaponSpawner />
              </>
            )}
          </Physics>
        </Canvas>

        {gameStarted && <PerformanceStats />}
        <Loader />
      </KeyboardControls>

      <ActivityLog />

      {gameStarted && <HUD />}
    </div>
  );
}
