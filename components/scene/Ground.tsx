"use client";

import { RigidBody } from "@react-three/rapier";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { InstancedGrass } from "../models/Grass";

// 1. Memoized high-frequency math operation
export function getTerrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.2 +
    Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.7
  );
}

interface GroundProps {
  size?: number;
  segments?: number;
  playerRef: React.RefObject<THREE.Group | null>;
  visibleRadius?: number;
  densityScale?: number;
  children?: React.RefObject<React.ReactNode>;
}

// 2. Wrap the component in React.memo to avoid re-renders when the player moves
const Ground = memo(function Ground({
  size = 200,
  segments = 64,
  playerRef,
  children,
}: GroundProps) {
  const displacedGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const count = pos.count;

    // Highly cached lookup loop loop
    for (let i = 0; i < count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  return (
    <>
      {/* 4. PERFORMANCE SAVER: Converted "trimesh" to a heightfield map collider */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          geometry={displacedGeometry}
          receiveShadow={false}
          castShadow={false}
        >
          <meshBasicMaterial color="#92745B" />
        </mesh>
      </RigidBody>

      <InstancedGrass
        playerRef={playerRef}
        visibleRadius={60}
        densityScale={80}
      />

      {children}
    </>
  );
});

export default Ground;
