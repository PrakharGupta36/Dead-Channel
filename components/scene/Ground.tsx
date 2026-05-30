"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { InstancedGrass } from "../models/Grass";

// ── Terrain height – must match the vertex shader exactly ───────────────────
export function getTerrainHeight(x: number, z: number): number {
  const gentleRoll = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.2;
  const minorBumps = Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.7;
  return gentleRoll + minorBumps;
}

interface GroundProps {
  size?: number;
  segments?: number;
  playerRef: React.RefObject<THREE.Object3D | null>;
  /**
   * visibleRadius and densityScale are passed through to the grass component
   * but do NOT linearly increase GPU cost thanks to the 3-LOD architecture:
   *
   *   visibleRadius – extends the outer LOD ring; inner LODs are unaffected.
   *   densityScale  – scales blades/chunk on all LODs uniformly (default 1.0).
   *                   Set to 2.0 for a lush field, 0.5 for a sparse meadow.
   */
  visibleRadius?: number;
  densityScale?: number;
  children?: React.ReactNode;
}

export default function Ground({
  size = 200,
  segments = 128,
  playerRef,

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
      {/* Terrain mesh with physics */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh geometry={displacedGeometry} receiveShadow castShadow>
          <meshToonMaterial color="#15803d" />
        </mesh>
      </RigidBody>

      {/* LOD grass – performance is constant regardless of visibleRadius */}
      <InstancedGrass
        playerRef={playerRef}
        visibleRadius={90}
        densityScale={3}
      />

      {children}
    </>
  );
}
