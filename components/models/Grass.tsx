"use client";

import { grassFragmentShader } from "@/lib/shaders/grass-fragment";
import { grassVertexShader } from "@/lib/shaders/grass-vertex";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

interface GrassProps {
  width: number;
  height: number;
  count: number;
  playerRef: React.RefObject<THREE.Object3D | null>;
  visibleRadius: number; // world‑space units
  getHeight: (x: number, z: number) => number;
}

export interface GrassHandle {
  updateInteraction: (x: number, y: number, z: number) => void;
}

const Grass = forwardRef<GrassHandle, GrassProps>(function Grass(
  { width, height, count, playerRef, visibleRadius, getHeight },
  ref,
) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const interactionPointRef = useRef<[number, number, number]>([0, 0, 0]);

  // ---------- geometry: blade is built SHORT (no mesh scale needed) ----------
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Ultra‑short blade: tip Y = 0.12, mid Y = 0.06
    const vertices = new Float32Array([
      -0.05,
      0.0,
      0.00, // 0: base left   (narrow width)
      0.05,
      0.0,
      0, // 1: base right
      -0.04,
      0.06,
      0, // 2: mid left
      0.04,
      0.06,
      0.00, // 3: mid right
      0.0,
      0.12,
      0, // 4: tip
    ]);

    const indices = new Uint16Array([0, 2, 1, 1, 2, 3, 2, 4, 3]);

    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    const offsets = new Float32Array(count * 3);
    const heights = new Float32Array(count);
    const randomSeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * width;
      const z = (Math.random() - 0.5) * height;
      // World‑space Y – no scaling, so blade base lands exactly on terrain
      offsets[i * 3] = x;
      offsets[i * 3 + 1] = getHeight(x, z);
      offsets[i * 3 + 2] = z;

      heights[i] = 0.1 + Math.random() * 0.5;
      randomSeeds[i] = Math.random();
    }

    geo.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3));
    geo.setAttribute("height", new THREE.InstancedBufferAttribute(heights, 1));
    geo.setAttribute(
      "randomSeed",
      new THREE.InstancedBufferAttribute(randomSeeds, 1),
    );

    return geo;
  }, [count, width, height, getHeight]);

  // ---------- material ----------
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: 0.5 },
        uWindSpeed: { value: 1.2 },
        uInteractionPoint: { value: new THREE.Vector3(0, 0, 0) },
        uInteractionRadius: { value: 1.0 },
        uInteractionStrength: { value: 0.8 },
        uGrassColor: { value: new THREE.Color(0.08, 0.3, 0.1) },
        uGrassColorTip: { value: new THREE.Color(0.0, 1.0, 0.0) },
        uPlayerPosition: { value: new THREE.Vector3(0, 0, 0) },
        uVisibleRadius: { value: visibleRadius },
      },
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
    });
  }, []);

  const playerWorld = useMemo(() => new THREE.Vector3(), []);
  const playerLocal = useMemo(() => new THREE.Vector3(), []);
  const interactionLocal = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !material.uniforms) return;

    material.uniforms.uTime.value += delta;

    interactionLocal.set(
      interactionPointRef.current[0],
      interactionPointRef.current[1],
      interactionPointRef.current[2],
    );
    mesh.worldToLocal(interactionLocal);
    material.uniforms.uInteractionPoint.value.copy(interactionLocal);

    if (playerRef?.current) {
      playerWorld.copy(playerRef.current.position);
    } else {
      playerWorld.copy(state.camera.position);
    }
    playerLocal.copy(playerWorld);
    mesh.worldToLocal(playerLocal);
    material.uniforms.uPlayerPosition.value.copy(playerLocal);

    material.uniforms.uVisibleRadius.value = visibleRadius;
    material.uniforms.uInteractionRadius.value = 10.0;
  });

  useImperativeHandle(
    ref,
    () => ({
      updateInteraction: (x: number, y: number, z: number) => {
        interactionPointRef.current = [x, y, z];
      },
    }),
    [],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
});

Grass.displayName = "Grass";
export default Grass;
