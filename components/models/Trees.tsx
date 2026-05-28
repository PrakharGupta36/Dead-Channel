"use client";

import { useGLTF } from "@react-three/drei";

import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { getTerrainHeight } from "@/components/scene/Ground"; 


type GLTFResult = GLTF & {
  nodes: {
    _1_tree__1_tree_0: THREE.Mesh;
    _2_tree__2_tree_0: THREE.Mesh;
    _3_tree__3_tree_0: THREE.Mesh;
    _4_tree__4_tree_0: THREE.Mesh;
    _5_tree__5_tree_0: THREE.Mesh;
    _6_tree__6_tree_0: THREE.Mesh;
    _7_tree__7_tree_0: THREE.Mesh;
    _10_tree__10_tree_0: THREE.Mesh;
    _11_tree__11_tree_0: THREE.Mesh;
    _12_tree__12_tree_0: THREE.Mesh;
    _8_tree__8_tree_0: THREE.Mesh;
    _9_tree__9_tree_0: THREE.Mesh;
    Rock_1__Rock_1__0: THREE.Mesh;
  };
  materials: {
    "1_tree": THREE.Material;
    "2_tree": THREE.Material;
    "3_tree": THREE.Material;
    "4_tree": THREE.Material;
    "5_tree": THREE.Material;
    "6_tree": THREE.Material;
    "7_tree": THREE.Material;
    "10_tree": THREE.Material;
    "11_tree": THREE.Material;
    "12_tree": THREE.Material;
    "8_tree": THREE.Material;
    "9_tree": THREE.Material;
    Rock_1: THREE.Material;
  };
};

interface SpawnerProps {
  count?: number;
  mapSize?: number;
  seed?: number;
}

interface TreeInstance {
  id: string;
  variantIndex: number;
  position: [number, number, number];
  scale: number;
  rotationY: number;
}

// Deterministic PRNG to keep placements identical across all network game clients
function createRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─────────────────────────────────────────────
// Main Vegetation Component
// ─────────────────────────────────────────────
export default function Trees({
  count = 30,
  mapSize = 180,
  seed = 777,
  ...props
}: SpawnerProps) {
  const { nodes, materials } = useGLTF(
    "/models/Trees.glb",
  ) as unknown as GLTFResult;

 
  const instances = useMemo<TreeInstance[]>(() => {
    const list: TreeInstance[] = [];
    const random = createRandom(seed);
    const minDistanceBetweenTrees = 8; 

    const farEnough = (pos: [number, number, number]) =>
      list.every((existing) => {
        const dx = pos[0] - existing.position[0];
        const dz = pos[2] - existing.position[2];
        return Math.sqrt(dx * dx + dz * dz) > minDistanceBetweenTrees;
      });

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let pos: [number, number, number] = [0, 0, 0];
      let valid = false;

      while (!valid && attempts < 30) {
        const x = (random() - 0.5) * mapSize;
        const z = (random() - 0.5) * mapSize;

        const y = getTerrainHeight(x, z);
        pos = [x, y, z];

        if (farEnough(pos)) {
          valid = true;
        }
        attempts++;
      }

      if (valid) {
        list.push({
          id: `tree-instance-${i}`,
          variantIndex: Math.floor(random() * 12), // Pick randomly between our 12 unique models
          position: pos,
          scale: 0.8 + random() * 0.4, // Subtle organic scale differences (80% - 120%)
          rotationY: random() * Math.PI * 2, // Full rotational distribution variation
        });
      }
    }
    return list;
  }, [count, mapSize, seed]);

  return (
    <group {...props}>
      {instances.map((tree) => (
        <RigidBody
          key={tree.id}
          type="fixed"
          position={tree.position}
          rotation={[0, tree.rotationY, 0]}
          colliders={false} // Use optimized collider primitives instead of complex trimeshes
        >
          {/* Cylinder collider centered around the trunk base zone */}
          <CylinderCollider args={[2, 0.4]} position={[0, 2, 0]} />

          {/* Group wrapper matches global file scale layout rules */}
          <group scale={0.05 * tree.scale}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes._6_tree__6_tree_0.geometry}
              material={materials["6_tree"]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={13.486}
            />
          </group>
        </RigidBody>
      ))}
    </group>
  );
}

useGLTF.preload("/models/Trees.glb");
