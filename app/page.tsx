"use client";

import HUD from "@/components/hud/HUD";
import BorderWalls from "@/components/scene/BorderWalls";
import Ground from "@/components/scene/Ground";
import Lights from "@/components/scene/Lights";
import Player from "@/components/scene/Player";
import Trees from "@/components/scene/Trees";
import { Controls } from "@/lib/controls";
import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

export default function Scene() {
  return (
    <div className="w-screen h-screen">
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

          {/* fog */}
          <fog attach="fog" args={["#ffffff", 20, 60]} />

          {/* lighting */}
          <ambientLight intensity={0.4} />

          <directionalLight
            castShadow
            intensity={1.5}
            position={[20, 30, 10]}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* physics */}
          <Physics gravity={[0, -9.81, 0]}>
            <Ground />
            <BorderWalls />
            <Trees />
            <Player />
          </Physics>
        </Canvas>
      </KeyboardControls>

      {/* UI */}
      <HUD />
    </div>
  );
}
