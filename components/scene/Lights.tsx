"use client";

import { useFrame } from "@react-three/fiber";
import {
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef } from "react";
import * as THREE from "three";

export default function Environment() {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Very cheap subtle motion
    if (sunRef.current) {
      sunRef.current.intensity = 0.72 + Math.sin(t * 0.5) * 0.04;
      sunRef.current.position.x = 35 + Math.sin(t * 0.15) * 2;
    }
  });

  return (
    <>
      {/* Atmosphere */}
      <color attach="background" args={["#49545c"]} />
      <fogExp2 attach="fog" args={["#49545c", 0.028]} />

      {/* Cheap global light */}
      <ambientLight intensity={0.06} />

      {/* Main moon light */}
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={0.78}
        position={[35, 45, 25]}
        color={"#d7e2ec"}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0004}
      />

      {/* Small fill light */}
      <directionalLight
        intensity={0.06}
        position={[-15, 8, -10]}
        color={"#42576a"}
      />

      {/* Lightweight postprocessing */}
      <EffectComposer multisampling={0}>
        {/* Tiny cinematic edge distortion */}
        <ChromaticAberration
          offset={new THREE.Vector2(0.0007, 0.0007)}
          blendFunction={BlendFunction.NORMAL}
        />

        {/* Film grain */}
        <Noise opacity={0.03} />

        {/* Horror-style dark edges */}
        <Vignette eskil={false} offset={0.22} darkness={1.1} />
      </EffectComposer>
    </>
  );
}
