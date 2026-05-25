"use client";

import { RigidBody } from "@react-three/rapier";
import { useState } from "react";

type Tree = {
  id: number;
  x: number;
  z: number;
  height: number;
  crown: number;
};

function generateTrees(): Tree[] {
  return Array.from({ length: 150 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 180,
    z: (Math.random() - 0.5) * 180,
    height: 3 + (Math.random() * 6 + 0.5),
    crown: 1 + (Math.random() * 2 + 0.5),
  }));
}

export default function Trees() {
  const [trees] = useState(generateTrees);

  return (
    <>
      {trees.map((tree) => (
        <RigidBody key={tree.id} type="fixed" position={[tree.x, 0, tree.z]}>
          <group>
            {/* trunk */}
            <mesh castShadow position={[0, tree.height / 2, 0]}>
              <cylinderGeometry args={[0.2, 0.3, tree.height]} />
              <meshStandardMaterial color="#5c3b22" />
            </mesh>

            {/* leaves */}
            <mesh castShadow position={[0, tree.height + 1, 0]}>
              <coneGeometry args={[tree.crown, tree.crown * 2, 8]} />
              <meshStandardMaterial color="#2f6b3b" />
            </mesh>
          </group>
        </RigidBody>
      ))}
    </>
  );
}
