"use client";

import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { usePlayerState } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import PlayerBody from "./shared/PlayerBody";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = { player: any };

// ── Pre-allocated scratch: one per remote player instance, not per frame ──────
// (Module-level would collide across instances — keep on the ref instead.)

export default function RemotePlayer({ player }: Props) {
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);

  // ── Per-instance scratch vectors (avoids cross-instance collision) ──────────
  const scratchCurrent = useRef(new THREE.Vector3());
  const scratchTarget = useRef(new THREE.Vector3());

  const [position] = usePlayerState(player, "position", [0, 0, 0]);
  const [color] = usePlayerState(player, "color", "#ffffff");
  const [name] = usePlayerState(player, "name", null);
  const [health] = usePlayerState(player, "health", 100);
  const [weapon] = usePlayerState(player, "weapon", null);
  const [remoteYaw] = usePlayerState(player, "yaw", Math.PI);
  const [remotePitch] = usePlayerState(player, "pitch", 0.3);

  // ── Spawn shield state ────────────────────────────────────────────────────
  const [spawnShield] = usePlayerState(player, "spawnShield", false);

  const pitchRef = useRef<number>(0.3);
  const aimingRef = useRef<boolean>(false);

  // ── isMoving: track via ref; only flip React state when it changes ────────
  const isMovingRef = useRef(false);
  const [isMoving, setIsMoving] = useState(false);

  // ── Cache position/yaw/pitch in refs so useFrame never reads stale closures
  const positionRef = useRef(position);
  const yawRef = useRef(remoteYaw as number);
  const remotePitchRef = useRef(remotePitch as number);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    yawRef.current = remoteYaw as number;
  }, [remoteYaw]);
  useEffect(() => {
    remotePitchRef.current = remotePitch as number;
  }, [remotePitch]);

  useFrame((_, delta) => {
    const rb = rbRef.current;
    if (!rb) return;

    const pos = positionRef.current;
    if (!Array.isArray(pos)) return;

    const cur = scratchCurrent.current;
    const tgt = scratchTarget.current;

    tgt.set(pos[0], pos[1], pos[2]);
    const t = rb.translation();
    cur.set(t.x, t.y, t.z);

    // ── Movement detection: compare squared distance to avoid sqrt ──────────
    const dx = cur.x - tgt.x;
    const dy = cur.y - tgt.y;
    const dz = cur.z - tgt.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const movingNow = distSq > 0.04 * 0.04; // 0.04² threshold

    if (movingNow !== isMovingRef.current) {
      isMovingRef.current = movingNow;
      setIsMoving(movingNow);
    }

    // ── Smooth lerp toward network position ──────────────────────────────────
    // exp-decay lerp: frame-rate independent, no Math.pow per frame
    const alpha = 1 - Math.exp(-12 * delta);
    cur.lerp(tgt, alpha);

    // ── Body rotation: always track synced yaw ──────────────────────────────
    if (meshGroupRef.current) {
      const targetYaw = yawRef.current + Math.PI;
      meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        meshGroupRef.current.rotation.y,
        targetYaw,
        0.15,
      );
    }

    pitchRef.current = THREE.MathUtils.lerp(
      pitchRef.current,
      remotePitchRef.current,
      0.15,
    );

    rb.setNextKinematicTranslation(cur);
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
      userData={{ playerId: player.id }}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <group visible={(health as number) > 0}>
        <PlayerBody
          ref={meshGroupRef}
          color={color as string}
          playerId={player.id}
          displayName={displayName}
          health={health as number}
          weapon={weapon}
          isLocal={false}
          aimPitch={pitchRef}
          isAiming={aimingRef}
          isMoving={isMoving}
          spawnShield={spawnShield as boolean}
        />
      </group>
    </RigidBody>
  );
}
