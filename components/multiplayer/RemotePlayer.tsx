"use client";

import { _remoteCurrent, _remoteTarget } from "@/lib/playerConstants";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { usePlayerState } from "playroomkit";
import { useRef } from "react";
import * as THREE from "three";
import PlayerBody from "./shared/PlayerBody";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = { player: any };

export default function RemotePlayer({ player }: Props) {
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);

  const [position] = usePlayerState(player, "position", [0, 0, 0]);
  const [color] = usePlayerState(player, "color", "#ffffff");
  const [name] = usePlayerState(player, "name", null);
  const [health] = usePlayerState(player, "health", 100);
  const [weapon] = usePlayerState(player, "weapon", null);
  // Receive synced aim angles
  const [remoteYaw] = usePlayerState(player, "yaw", Math.PI);
  const [remotePitch] = usePlayerState(player, "pitch", 0.3);

  // Stable refs so EquippedWeapon can read them in useFrame without re-renders
  const pitchRef = useRef<number>(0.3);
  const aimingRef = useRef<boolean>(false); // remotes never ADS-zoom the camera

  useFrame((_, delta) => {
    if (!rbRef.current || !Array.isArray(position)) return;

    _remoteTarget.set(position[0], position[1], position[2]);

    const t = rbRef.current.translation();
    _remoteCurrent.set(t.x, t.y, t.z);
    _remoteCurrent.lerp(_remoteTarget, 1 - Math.pow(0.01, delta));

    // Face the synced yaw direction
    if (meshGroupRef.current) {
      meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        meshGroupRef.current.rotation.y,
        remoteYaw as number,
        0.15,
      );
    }

    // Keep pitch ref up to date for the weapon tilt
    pitchRef.current = THREE.MathUtils.lerp(
      pitchRef.current,
      remotePitch as number,
      0.15,
    );

    rbRef.current.setNextKinematicTranslation(_remoteCurrent);
  });

  const initialPos = Array.isArray(position)
    ? (position as [number, number, number])
    : ([0, 0, 0] as [number, number, number]);

  const displayName = name ?? player.getProfile().name ?? "Player";

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
        playerId={displayName}
        health={health}
        weapon={weapon}
        isLocal={false}
        aimPitch={pitchRef}
        isAiming={aimingRef}
      />
    </RigidBody>
  );
}
