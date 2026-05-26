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

import PlayerManager from "@/components/multiplayer/shared/PlayerManager";
import PerformanceStats from "../debug/PerformanceStats";
import WeaponSpawner from "../weapons/WeaponSpawner";

// Add the prop interface
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
          shadows
          camera={{
            position: [0, 5, 10],
            fov: 50,
          }}
        >
          <Lights />
          <fog attach="fog" args={["#ffffff", 40, 60]} />
          <ambientLight intensity={0.4} />

          <directionalLight
            castShadow
            intensity={1.5}
            position={[20, 30, 10]}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          <Physics gravity={[0, -9.81, 0]}>
            <Ground />
            <BorderWalls />
            <Trees />

            {/* Only mount gameplay mechanics AFTER the lobby phase ends */}
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

      {/* Only show the gameplay HUD when the game is active */}
      {gameStarted && <HUD />}
    </div>
  );
}
