"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import Grass, { GrassHandle } from "../models/Grass";

export function getTerrainHeight(x: number, z: number): number {
  const gentleRoll = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 1.2;
  const minorBumps = Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.3;
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
  segments = 64,
  playerRef,
  visibleRadius = 45.0,
  children,
}: GroundProps) {
  const grassRef = useRef<GrassHandle>(null);

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
          <meshStandardMaterial
            color="#20ff30"
            roughness={0.8}
            flatShading={false}
          />
        </mesh>
      </RigidBody>

      <Grass
        ref={grassRef}
        width={size}
        height={size}
        count={840000}
        playerRef={playerRef}
        visibleRadius={visibleRadius}
        getHeight={getTerrainHeight}
      />

      {children}
    </>
  );
}
