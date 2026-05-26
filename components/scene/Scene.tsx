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

import PlayerManager from "@/components/multiplayer/PlayerManager";
import { startPlayroom } from "@/lib/playroom";
import { useEffect, useState } from "react";
import PerformanceStats from "../debug/PerformanceStats";

export default function Scene() {
  const [playroomReady, setPlayroomReady] = useState(false);

  useEffect(() => {
    startPlayroom().then(() => {
      setPlayroomReady(true);
    });
  }, []);

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

          <fog attach="fog" args={["#ffffff", 40, 60]} />

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
            {/* Only mount PlayerManager after Playroom is initialised */}
            {playroomReady && <PlayerManager />}
          </Physics>
        </Canvas>
        <PerformanceStats />
        <Loader />
      </KeyboardControls>

      {/* UI */}
      <HUD />
    </div>
  );
}
