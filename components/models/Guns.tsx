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
    <group {...props} dispose={null} rotation={[0, 0, -Math.PI / 2]} >
      <group scale={0.01}> 
        {/* SMG */}
        {type === "smg" && (
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.MG1_Grey_0.geometry}
            material={materials.Grey}
            position={[-249.962, 100.857, 43.286]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
        )}

        {/* AK47 */}
        {type === "ak47" && (
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.MG5_Grey_0.geometry}
            material={materials.Grey}
            position={[28.001, 100.857, 43.286]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
        )}

        {/* PISTOL */}
        {type === "pistol" && (
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.MSR_Grey_0.geometry}
            material={materials.Grey}
            position={[-229.359, 100.857, -652.971]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={100}
          />
        )}
      </group>
    </group>
  );
}

useGLTF.preload("/models/Guns.glb");
