"use client";

import { grassFragmentShader } from "@/lib/shaders/grass/grass-fragment";
import { grassVertexShader } from "@/lib/shaders/grass/grass-vertex";
import { useFrame } from "@react-three/fiber";
import { FC, useMemo, useRef } from "react";
import * as THREE from "three";

interface RapierRigidBodyLike {
  translation: () => { x: number; y: number; z: number };
  getWorldPosition?: (target: THREE.Vector3) => THREE.Vector3;
}

interface GrassFieldProps {
  playerRef: React.RefObject<THREE.Object3D | RapierRigidBodyLike | null>;
  visibleRadius?: number;
  densityScale?: number;
}

export const InstancedGrass: FC<GrassFieldProps> = ({
  playerRef,
  visibleRadius = 55, // Expanded slightly to handle the 200k distribution range beautifully
  densityScale = 1.0,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const playerPos = useRef(new THREE.Vector3());

  // Target 200,000 perfectly balanced into a square root layout
  const density = useMemo(() => {
    const baseCount = 16000; // 450 * 450 grid matrix mapping
    const side = Math.round(Math.sqrt(baseCount * densityScale));
    return side * side;
  }, [densityScale]);

  // ULTRA-LIGHTWEIGHT GEOMETRY: 3 Triangles (4 Vertices instead of 5)
  // Reduces overall triangle processing count down to 600,000 across the environment pool
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const hw = 0.1; // Leaner blade width for denser packing
    const h = 0.5;

    const vertices = new Float32Array([
      -hw,
      0,
      0, // 0: Base Left
      hw,
      0,
      0, // 1: Base Right
      -hw * 0.5,
      h * 0.5,
      0.02, // 2: Mid Left (Slight offset for profile depth)
      0,
      h,
      0.1, // 3: Tip (Single point merge skips 1 vertex per blade entirely)
    ]);

    const indices = [
      0,
      1,
      2, // Triangle 1 (Lower Left half)
      1,
      3,
      2, // Triangle 2 (Lower Right half extending up)
      2,
      3,
      1, // Back-closing alternate wedge (No degenerate indexing overhead)
    ];

    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);

    // We omit normal generation arrays because we manually mathematically calculate
    // lighting trajectories per instance directly within the GLSL runtime.
    return geo;
  }, []);

  const material = useMemo(() => {
    const instanceOffsets = new Float32Array(density * 2);
    const side = Math.round(Math.sqrt(density));

    for (let i = 0; i < density; i++) {
      const cx = i % side;
      const cz = Math.floor(i / side);
      // Normalized safe-space random jitter pre-calculated on initialization to save ALU loops
      const jitterX = (Math.sin(i * 0.123) * 0.5 + 0.5) * 0.4;
      const jitterZ = (Math.cos(i * 0.456) * 0.5 + 0.5) * 0.4;

      instanceOffsets[i * 2] =
        (cx / (side - 1) - 0.5 + jitterX) * visibleRadius * 2.0;
      instanceOffsets[i * 2 + 1] =
        (cz / (side - 1) - 0.5 + jitterZ) * visibleRadius * 2.0;
    }

    geometry.setAttribute(
      "aInstanceOffset",
      new THREE.InstancedBufferAttribute(instanceOffsets, 2),
    );

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3() },
        uRadius: { value: visibleRadius },
        uBaseColor: { value: new THREE.Color("#355749") },
        uMiddleColor: { value: new THREE.Color("#057a26") },
        uTipColor: { value: new THREE.Color("#d5ff00") },
        uFogColor: { value: new THREE.Color("#2d542d") },
      },
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
  }, [geometry, density, visibleRadius]);

  useFrame(({ clock, camera }) => {
    const mat = matRef.current;
    if (!mat) return;

    const currentTarget = playerRef.current;
    if (currentTarget) {
      if (
        "translation" in currentTarget &&
        typeof currentTarget.translation === "function"
      ) {
        const t = (currentTarget as RapierRigidBodyLike).translation();
        playerPos.current.set(t.x, t.y, t.z);
      } else if (
        "getWorldPosition" in currentTarget &&
        typeof currentTarget.getWorldPosition === "function"
      ) {
        currentTarget.getWorldPosition(playerPos.current);
      } else if ("position" in currentTarget) {
        playerPos.current.copy((currentTarget as THREE.Object3D).position);
      }
    } else {
      playerPos.current.copy(camera.position);
    }

    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uPlayerPos.value.copy(playerPos.current);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, density]}
      frustumCulled={false} // Retained true infinite tracking simulation behavior
    >
      <primitive object={material} ref={matRef} attach="material" />
    </instancedMesh>
  );
};
