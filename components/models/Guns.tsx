"use client";

import { useGLTF } from "@react-three/drei";
import { JSX } from "react";
import * as THREE from "three";
import { GLTF } from "three-stdlib";

export type GunType = "smg" | "ak47" | "pistol";

type GLTFResult = GLTF & {
  nodes: {
    MG1_Grey_0: THREE.Mesh;
    MG5_Grey_0: THREE.Mesh;
    MSR_Grey_0: THREE.Mesh;
  };
  materials: {
    Grey: THREE.MeshStandardMaterial;
  };
};

type Props = JSX.IntrinsicElements["group"] & {
  type: GunType;
};

export default function Guns({ type, ...props }: Props) {
  const { nodes, materials } = useGLTF(
    "/models/Guns.glb",
  ) as unknown as GLTFResult;

  return (
    <group {...props} dispose={null} rotation={[0, 0, -Math.PI / 2]}>
      <group scale={0.01}>
        {/* PERFORMANCE FIX: 
          All meshes remain mounted constantly. We use the 'visible' attribute.
          All baked offset positions are overridden to [0, 0, 0] so they stay centered in the hand!
        */}

        {/* SMG */}
        <mesh
          visible={type === "smg"}
          castShadow
          receiveShadow
          geometry={nodes.MG1_Grey_0.geometry}
          material={materials.Grey}
          position={[0, 0, 0]} // Fixed baked offset
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />

        {/* AK47 */}
        <mesh
          visible={type === "ak47"}
          castShadow
          receiveShadow
          geometry={nodes.MG5_Grey_0.geometry}
          material={materials.Grey}
          position={[0, 0, 0]} // Fixed baked offset
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />

        {/* PISTOL */}
        <mesh
          visible={type === "pistol"}
          castShadow
          receiveShadow
          geometry={nodes.MSR_Grey_0.geometry}
          material={materials.Grey}
          position={[0, 0, 0]} // Fixed baked offset
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/models/Guns.glb");
