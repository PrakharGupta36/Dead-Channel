"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { InstancedGrass } from "../models/Grass";

export function getTerrainHeight(x: number, z: number): number {
  const gentleRoll = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.2;
  const minorBumps = Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.7;
  return gentleRoll + minorBumps;
}

interface GroundProps {
  size?: number;
  segments?: number;
  // FIX: Allow any or specific Rapier types to easily accept rigidbodies passed as refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef: React.RefObject<any>;
  visibleRadius?: number;
  densityScale?: number;
  children?: React.ReactNode;
}

export default function Ground({
  size = 200,
  segments = 128,
  playerRef,
  visibleRadius = 55, // Adjusted to balance dense distribution radius loops perfectly
  densityScale = 2.0,
  children,
}: GroundProps) {
  const displacedGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  return (
    <>
      <RigidBody type="fixed" colliders="trimesh">
        <mesh geometry={displacedGeometry} receiveShadow castShadow>
          <meshToonMaterial color="#15803d" />
        </mesh>
      </RigidBody>

      <InstancedGrass
        playerRef={playerRef}
        visibleRadius={visibleRadius}
        densityScale={densityScale}
      />

      {children}
    </>
  );
}
