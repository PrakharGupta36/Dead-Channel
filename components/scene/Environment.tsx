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
      sunRef.current.position.x = 35 + Math.sin(t * 0.15) * 10;
    }
  });

  return (
    <>
      {/* Atmosphere */}
      <color attach="background" args={["#49545c"]} />
      <fogExp2 attach="fog" args={["#49545c", 0.03]} />

      {/* Cheap global light */}
      <ambientLight intensity={0.3} />


      {/* Lightweight postprocessing */}
      <EffectComposer multisampling={0}>
        {/* Tiny cinematic edge distortion */}
        <ChromaticAberration
          offset={new THREE.Vector2(0.0007, 0.0007)}
          blendFunction={BlendFunction.NORMAL}
        />

        {/* Film grain */}
        <Noise opacity={0.04} />

        {/* Horror-style dark edges */}
        <Vignette eskil={false} offset={0.12} darkness={1.1} />
      </EffectComposer>
    </>
  );
}
