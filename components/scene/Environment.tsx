"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function Environment() {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) {
      // Gentle golden-hour sway calculated without creating garbage collection overhead
      sunRef.current.intensity = 1.1 + Math.sin(t * 0.4) * 0.08;
      sunRef.current.position.x = 40 + Math.sin(t * 0.12) * 12;
      sunRef.current.position.z = 15 + Math.cos(t * 0.08) * 8;
    }
  });

  const background = "#DCE1E3";

  return (
    <>
      {/* 1. Global Setup */}
      <color attach="background" args={[background]} />
      {/* Fog pulled slightly inward to naturally clip out-of-bounds instanced elements */}
      <fog attach="fog" args={[background, 20, 75]} />

      {/* 2. Light Consolidation: 
        Replaced the ambient light and 3 separate custom fill/sky-dome directional lights 
        with a single HemisphereLight. This calculates a perfect sky-to-ground ambient 
        gradient instantly in a single uniform calculation.
      */}
      <hemisphereLight
        args={["#b3d1ff", "#4d5933", 0.65]}
        position={[0, 50, 0]}
      />

      {/* 3. Optimized Primary Sun & Shadow Cascades:
        The Orthographic shadow camera bounds have been tightened down significantly.
        Reducing the frustum volume prevents the engine from wasting valuable shadow-map depth space.
      */}
      <directionalLight
        ref={sunRef}
        position={[40, 18, 15]}
        intensity={1.2}
        color="#ffe4a0"
        castShadow
        shadow-mapSize={[1024, 1024]} // Optimized down from 2048 (Saves massive GPU memory bandwith)
        shadow-camera-near={10}
        shadow-camera-far={150} // Pulled forward so shadow depths map tightly to active zones
        shadow-camera-left={-60} // Clipped strictly around the player view zone
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0002} // Stabilized bias adjustment for lower-res depth map
      />
    </>
  );
}
