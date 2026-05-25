"use client";

import { RigidBody } from "@react-three/rapier";

const CHUNK_SIZE = 20;
const RENDER_DISTANCE = 3;

export default function World() {
  const chunks = [];

  for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
    for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
      chunks.push(
        <RigidBody
          type="fixed"
          key={`${x}-${z}`}
          position={[x * CHUNK_SIZE, 0, z * CHUNK_SIZE]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[CHUNK_SIZE, CHUNK_SIZE]} />

            <meshStandardMaterial
              color="green"
              metalness={0.2}
              roughness={0.8}
            />
          </mesh>
        </RigidBody>,
      );
    }
  }

  return <>{chunks}</>;
}
