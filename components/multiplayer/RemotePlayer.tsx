"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { usePlayerState } from "playroomkit";
import { useRef } from "react";
import * as THREE from "three";
import EquippedWeapon from "../weapons/EquippedWeapon";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = { player: any };

const _target = new THREE.Vector3();
const _current = new THREE.Vector3();

export default function RemotePlayer({ player }: Props) {
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);

  const [position] = usePlayerState(player, "position", [0, 0, 0]);
  const [color] = usePlayerState(player, "color", "#ffffff");
  const [name] = usePlayerState(player, "name", "Player");
  const [health] = usePlayerState(player, "health", 100);
  const [weapon] = usePlayerState(player, "weapon", null);

  useFrame((_, delta) => {
    if (!rbRef.current || !Array.isArray(position)) return;

    _target.set(position[0], position[1], position[2]);

    const t = rbRef.current.translation();
    _current.set(t.x, t.y, t.z);

    const lerpFactor = 1 - Math.pow(0.01, delta);
    _current.lerp(_target, lerpFactor);

    if (meshGroupRef.current) {
      const dirX = _target.x - _current.x;

      const dirZ = _target.z - _current.z;

      if (Math.abs(dirX) > 0.001 || Math.abs(dirZ) > 0.001) {
        const angle = Math.atan2(dirX, dirZ);

        meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          meshGroupRef.current.rotation.y,
          angle,
          0.15,
        );
      }
    }

    rbRef.current.setNextKinematicTranslation(_current);
  });

  return (
    <RigidBody
      ref={rbRef}
      type="kinematicPosition"
      colliders={false}
      position={
        Array.isArray(position)
          ? [position[0], position[1], position[2]]
          : [0, 0, 0]
      }
    >
      <CapsuleCollider args={[0.5, 0.5]} />

      <group ref={meshGroupRef}>
        {/* Same +0.5 offset as LocalPlayer so both sit at identical visual Y */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {weapon && <EquippedWeapon weapon={weapon} isLocal />}

        <Html position={[0, 2.2, 0]} center distanceFactor={10} occlude>
          <div className="pointer-events-none select-none">
            <div
              className="mb-1 text-center text-xs font-bold drop-shadow"
              style={{ color }}
            >
              {name}
            </div>
            <div className="h-3 w-24 overflow-hidden rounded-full border border-black/40 bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-300"
                style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
              />
            </div>
          </div>
        </Html>
      </group>
    </RigidBody>
  );
}
