"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import Ground from "./Ground";
import Player from "./Player";
import RemotePlayers from "./RemotePlayers";

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 6, 10], fov: 60 }} className="bg-black">
      {/* Lights */}
      <ambientLight intensity={1} />
      <directionalLight position={[5, 10, 5]} intensity={2} />

      {/* Fog */}
      <fog attach="fog" args={["#000000", 10, 40]} />

      {/* World */}
      <Ground />

      {/* Players */}
      <Player />
      <RemotePlayers />

      {/* Temp camera controls */}
      <OrbitControls />
    </Canvas>
  );
}
