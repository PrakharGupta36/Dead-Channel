"use client";

import { useMemo } from "react";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";

// ─────────────────────────────────────────────
// Reusable Elevation Function
// ─────────────────────────────────────────────
export function getTerrainHeight(x: number, z: number): number {
  // 1. Gentle rolling landscape ripples (stretched out and maxed out at 1.2 units height)
  const gentleRoll = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.2;

  // 2. Micro surface bumps (frequent tiny variations maxed out at 0.3 units height)
  const minorBumps = Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.3;

  return gentleRoll + minorBumps;
}

interface GroundProps {
  size?: number;
  segments?: number;
  children?: React.ReactNode;
}

export default function Ground({
  size = 200,
  segments = 64,
  children,
}: GroundProps) {
  // Generate the displacement math once on mount
  const displacedGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Align horizontally

    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);

      // Use the global terrain utility function
      const targetHeight = getTerrainHeight(x, z);

      positionAttribute.setY(i, targetHeight);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  return (
    <>
      {/* Physical Terrain */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh geometry={displacedGeometry} receiveShadow castShadow>
          <meshStandardMaterial
            color="#20ff30"
            roughness={0.8}
            flatShading={true}
          />
        </mesh>
      </RigidBody>

      {/* Render children (like your trees) with access to the scene map context */}
      {children}
    </>
  );
}
