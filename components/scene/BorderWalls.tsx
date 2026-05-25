"use client";

import { RigidBody } from "@react-three/rapier";

const SIZE = 200;
const WALL_HEIGHT = 20;
const THICKNESS = 2;

export default function BorderWalls() {
  return (
    <>
      {/* NORTH */}
      <RigidBody type="fixed">
        <mesh position={[0, WALL_HEIGHT / 2, -SIZE / 2]}>
          <boxGeometry args={[SIZE, WALL_HEIGHT, THICKNESS]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* SOUTH */}
      <RigidBody type="fixed">
        <mesh position={[0, WALL_HEIGHT / 2, SIZE / 2]}>
          <boxGeometry args={[SIZE, WALL_HEIGHT, THICKNESS]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* EAST */}
      <RigidBody type="fixed">
        <mesh position={[SIZE / 2, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[THICKNESS, WALL_HEIGHT, SIZE]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>

      {/* WEST */}
      <RigidBody type="fixed">
        <mesh position={[-SIZE / 2, WALL_HEIGHT / 2, 0]}>
          <boxGeometry args={[THICKNESS, WALL_HEIGHT, SIZE]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </RigidBody>
    </>
  );
}
