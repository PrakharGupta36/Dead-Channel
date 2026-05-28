"use client";

import { Controls } from "@/lib/controls";
import {
  CAM_DIST,
  CAM_HEIGHT,
  COLORS,
  JUMP_VEL,
  NET_SYNC_INTERVAL_MS,
  RUN_SPEED,
  SPAWN_POSITIONS,
  WALK_SPEED,
  _camFwd,
  _camPos,
  _camRight,
  _lookAt,
  _moveDir,
  _up,
} from "@/lib/playerConstants";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { myPlayer, usePlayerState, usePlayersList } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import PlayerBody from "./shared/PlayerBody";

export default function LocalPlayer() {
  const player = myPlayer();
  const players = usePlayersList();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const lastNetSync = useRef(0);

  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  const yaw = useRef(Math.PI);
  const pitch = useRef(0.4);

  // weapon is now set exclusively by WeaponSpawner via shared room state
  const [weapon] = usePlayerState(player, "weapon", null);
  const [customName] = usePlayerState(player, "customName", null);

  const [color] = useState(
    () => COLORS[Math.floor(Math.random() * COLORS.length)],
  );

  const [spawnPosition] = useState<[number, number, number]>(() => {
    const me = player?.id;
    const ordered = [...players].sort((a, b) => a.id.localeCompare(b.id));
    const myIndex = me ? ordered.findIndex((p) => p.id === me) : -1;

    if (myIndex >= 0) return SPAWN_POSITIONS[myIndex % SPAWN_POSITIONS.length];

    const fallback = me
      ? Array.from(me).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
      : 0;
    return SPAWN_POSITIONS[fallback % SPAWN_POSITIONS.length];
  });

  const [health] = useState(100);

  useEffect(() => {
    let dragging = false;

    const onDown = (e: MouseEvent) => {
      if (e.button === 0) dragging = true;
    };
    const onUp = () => {
      dragging = false;
    };
    const onLeave = () => {
      dragging = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      yaw.current -= e.movementX * 0.005;
      pitch.current = Math.max(
        0.2,
        Math.min(1.2, pitch.current + e.movementY * 0.003),
      );
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  useEffect(() => {
    if (!player) return;
    player.setState("health", health);
    player.setState("color", color);
    const displayName = customName ?? player.getProfile().name;
    player.setState("name", displayName);
  }, [player, color, health, customName]);

  useFrame((_, delta) => {
    const rb = rbRef.current;
    if (!rb) return;

    const { forward, backward, leftward, rightward, jump, run } = getKeys();
    const speed = run ? RUN_SPEED : WALK_SPEED;

    _camFwd.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
    _camRight.crossVectors(_camFwd, _up).normalize();

    _moveDir.set(0, 0, 0);
    if (forward) _moveDir.add(_camFwd);
    if (backward) _moveDir.sub(_camFwd);
    if (rightward) _moveDir.add(_camRight);
    if (leftward) _moveDir.sub(_camRight);
    if (_moveDir.lengthSq() > 0) _moveDir.normalize();

    const vel = rb.linvel();
    rb.setLinvel(
      {
        x: THREE.MathUtils.lerp(vel.x, _moveDir.x * speed, 0.18),
        y: vel.y,
        z: THREE.MathUtils.lerp(vel.z, _moveDir.z * speed, 0.18),
      },
      true,
    );

    if (_moveDir.lengthSq() > 0.001 && meshGroupRef.current) {
      meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        meshGroupRef.current.rotation.y,
        Math.atan2(_moveDir.x, _moveDir.z),
        0.18,
      );
    }

    const freshVel = rb.linvel();
    if (jump && Math.abs(freshVel.y) < 0.05) {
      rb.setLinvel({ x: freshVel.x, y: JUMP_VEL, z: freshVel.z }, true);
    }

    const t = rb.translation();
    _lookAt.lerp(
      new THREE.Vector3(t.x, t.y + CAM_HEIGHT, t.z),
      1 - Math.exp(-12 * delta),
    );
    _camPos.set(
      t.x - Math.sin(yaw.current) * Math.cos(pitch.current) * CAM_DIST,
      t.y + Math.sin(pitch.current) * CAM_DIST + CAM_HEIGHT,
      t.z - Math.cos(yaw.current) * Math.cos(pitch.current) * CAM_DIST,
    );
    camera.position.lerp(_camPos, 1 - Math.exp(-8 * delta));
    camera.lookAt(_lookAt);

    const now = performance.now();
    if (player && now - lastNetSync.current > NET_SYNC_INTERVAL_MS) {
      player.setState("position", [t.x, t.y, t.z], false);
      lastNetSync.current = now;
    }
  });

  if (!player) return null;

  const displayName = customName ?? player.getProfile().name ?? "Player";

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      position={spawnPosition}
      enabledRotations={[false, false, false]}
      linearDamping={4}
      angularDamping={10}
      canSleep={false}
    >
      <CapsuleCollider args={[0.5, 0.5]} />

      <PlayerBody
        ref={meshGroupRef}
        color={color}
        playerId={displayName}
        health={health}
        weapon={weapon}
        isLocal
        label="(You)"
      />
    </RigidBody>
  );
}
