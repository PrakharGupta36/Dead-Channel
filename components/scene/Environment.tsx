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

    if (sunRef.current) {
      sunRef.current.intensity = 0.52 + Math.sin(t * 0.5) * 0.04;
      sunRef.current.position.x = 35 + Math.sin(t * 0.15) * 10;
    }
  });

  return (
    <>
      {/* Atmosphere */}
      <color attach="background" args={["#49545c"]} />
      <fogExp2 attach="fog" args={["#49545c", 0.03]} />

      {/* Ambient environment base light */}
      <ambientLight intensity={0.25} />

      {/* Main dim dynamic scene light */}
      <directionalLight
        ref={sunRef}
        position={[35, 15, 20]}
        intensity={0.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Secondary ambient fill bouncing off the forcefield perimeter */}
      <directionalLight position={[0, 5, 0]} intensity={0.15} color="#00aaff" />

      {/* Postprocessing */}
      <EffectComposer multisampling={0}>
        <ChromaticAberration
          offset={new THREE.Vector2(0.001, 0.001)} // Slightly boosted to match shader glitch style
          blendFunction={BlendFunction.NORMAL}
        />

        <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />

        <Vignette eskil={false} offset={0.15} darkness={0.95} />
      </EffectComposer>
    </>
  );
}
