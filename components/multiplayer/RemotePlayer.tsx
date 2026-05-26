"use client";

import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { usePlayerState } from "playroomkit";
import { useRef } from "react";
import * as THREE from "three";
import PlayerBody from "./shared/PlayerBody";
import { _remoteCurrent, _remoteTarget } from "@/lib/playerConstants";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = { player: any };

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

    _remoteTarget.set(position[0], position[1], position[2]);

    const t = rbRef.current.translation();
    _remoteCurrent.set(t.x, t.y, t.z);
    _remoteCurrent.lerp(_remoteTarget, 1 - Math.pow(0.01, delta));

    // Face movement direction
    if (meshGroupRef.current) {
      const dx = _remoteTarget.x - _remoteCurrent.x;
      const dz = _remoteTarget.z - _remoteCurrent.z;
      if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
        meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          meshGroupRef.current.rotation.y,
          Math.atan2(dx, dz),
          0.15,
        );
      }
    }

    rbRef.current.setNextKinematicTranslation(_remoteCurrent);
  });

  const initialPos = Array.isArray(position)
    ? (position as [number, number, number])
    : ([0, 0, 0] as [number, number, number]);

  return (
    <RigidBody
      ref={rbRef}
      type="kinematicPosition"
      colliders={false}
      position={initialPos}
    >
      <CapsuleCollider args={[0.5, 0.5]} />

      <PlayerBody
        ref={meshGroupRef}
        color={color}
        name={name}
        health={health}
        weapon={weapon}
        isLocal={false}
      />
    </RigidBody>
  );
}
