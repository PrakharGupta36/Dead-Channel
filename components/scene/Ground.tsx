"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { InstancedGrass } from "../models/Grass";

// ── Terrain height function (must match vertex shader!) ──
export function getTerrainHeight(x: number, z: number): number {
  const gentleRoll = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.2;
  const minorBumps = Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.7;
  return gentleRoll + minorBumps;
}

interface GroundProps {
  size?: number;
  segments?: number;
  playerRef: React.RefObject<THREE.Object3D | null>;
  visibleRadius?: number;
  children?: React.ReactNode;
}

export default function Ground({
  size = 200,
  segments = 128,
  playerRef,
  visibleRadius = 50.0,
  children,
}: GroundProps) {
  const displacedGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positionAttribute = geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);
      positionAttribute.setY(i, getTerrainHeight(x, z));
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  return (
    <>
      {/* Terrain */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh geometry={displacedGeometry} receiveShadow castShadow>
          <meshToonMaterial color="#15803d" />
        </mesh>
      </RigidBody>

      {/* Procedural grass that follows the player */}
      <InstancedGrass
        playerRef={playerRef}
        visibleRadius={35}
        instancesPerChunk={1500}
      />

      {children}
    </>
  );
}
