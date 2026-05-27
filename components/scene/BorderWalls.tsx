"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { getTerrainHeight } from "./Ground"; // Ensure this import path is correct

interface BorderWallsProps {
  size?: number; // Must match your Ground component's size (200)
  segments?: number; // Visual resolution of the border geometry ring
}

export default function BorderWalls({
  size = 200,
  segments = 64,
}: BorderWallsProps) {
  const cliffGeometry = useMemo(() => {
    // We create a hollow tube/cylinder geometry to act as the boundary ring
    const radius = size / 2;
    const height = 25; // How tall the protective mountain cliffs are

    const geometry = new THREE.CylinderGeometry(
      radius + 4, // Top radius (slanted slightly outward)
      radius, // Bottom radius (snaps to edge of the play arena)
      height,
      segments,
      8, // Vertical height segments to allow rocky deform variation
      true, // Open ended (no top or bottom lids needed)
    );

    // Center the cylinder so the bottom sits at roughly ground level
    geometry.translate(0, height / 2, 0);

    const positionAttribute = geometry.attributes.position;

    // Deform the cylinder coordinates to look like natural, jagged low-poly rocks
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      // 1. Calculate the angle from the center of the world
      const angle = Math.atan2(z, x);

      // 2. Sample your existing terrain base height at this boundary coordinate
      const baseGroundY = getTerrainHeight(x, z);

      // 3. Inject jagged procedural rock displacement using trigonometry wave layers
      const rockNoise =
        Math.sin(angle * 12) * Math.cos(y * 0.4) * 2.5 +
        Math.sin(angle * 32) * 0.8;

      // Push vertices outward/inward slightly based on angle to make it uneven, non-perfect circle
      const pushFactor = 1.0 + Math.sin(angle * 8) * Math.cos(angle * 4) * 0.04;

      // Apply the offsets
      positionAttribute.setX(i, x * pushFactor);
      positionAttribute.setZ(i, z * pushFactor);

      // Make the bottom of the cliffs blend flawlessly into your bumpy floor
      if (y < 2) {
        positionAttribute.setY(i, baseGroundY + y);
      } else {
        positionAttribute.setY(i, baseGroundY + y + rockNoise);
      }
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={cliffGeometry} receiveShadow castShadow>
        <meshStandardMaterial
          color="#434c5e" 
          roughness={0.85}
          metalness={0.15}
          flatShading={true} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </RigidBody>
  );
}
