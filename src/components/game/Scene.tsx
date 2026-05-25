"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

import Player from "./Player";
import RemotePlayers from "./RemotePlayers";
import World from "./World";

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 12], fov: 60 }}
      className="bg-black"
    >
      {/* Lights */}
      <ambientLight intensity={0.5} />

      <directionalLight castShadow position={[10, 10, 5]} intensity={2} />

      {/* Fog */}
      <fog attach="fog" args={["#000000", 10, 50]} />

      <Physics>
        <World />
        <Player />
        <RemotePlayers />
      </Physics>
    </Canvas>
  );
}
