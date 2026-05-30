"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { InstancedGrass } from "../models/Grass";

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

    for (let i = 0; i < count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  // Safe fallback: If a catastrophic lag spike occurs, catch the player and teleport them back up
  useFrame(() => {
    if (playerRef?.current) {
      if (playerRef.current.position.y < -15) {
        // Find center terrain height or hardcode an explicit spawn coordinate
        const spawnY = getTerrainHeight(0, 0) + 2;

        // If checking a Rapier controller/rigid-body api object directly:
        // e.g., rigidBodyRef.current.setTranslation({ x: 0, y: spawnY, z: 0 })
        playerRef.current.position.set(0, spawnY, 0);
      }
    }
  });

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <mesh geometry={displacedGeometry}>
          <meshBasicMaterial color="#92745B" />
        </mesh>

        <CuboidCollider
          args={[size / 2, 0.5, size / 2]}
          position={[0, -0.4, 0]} 
        />
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
