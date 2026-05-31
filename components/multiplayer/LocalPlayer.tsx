/* eslint-disable react-hooks/immutability */
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

const FOV_DEFAULT = 45;
const FOV_ADS = 30;
const ADS_LERP = 0.12;
const CAM_DIST_ADS = CAM_DIST * 0.6;

export default function LocalPlayer() {
  const player = myPlayer();
  const players = usePlayersList();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const lastNetSync = useRef(0);

  const { camera, gl } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  const yaw = useRef(Math.PI);
  const pitch = useRef(0.3);
  const isAiming = useRef(false);
  const isShooting = useRef(false);
  const currentFov = useRef(FOV_DEFAULT);
  const isLocked = useRef(false);
  const pitchRef = useRef(0.3);

  const playerPositionRef = useRef(new THREE.Vector3());

  const [weapon] = usePlayerState(player, "weapon", null);
  const [customName] = usePlayerState(player, "customName", null);
  const [isFiring, setFiringState] = usePlayerState(player, "firing", false);

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

  // ── Pointer Lock ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement;
    const requestLock = () => canvas.requestPointerLock();
    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      yaw.current -= e.movementX * 0.002;
      pitch.current = Math.max(
        -0.05,
        Math.min(1.3, pitch.current + e.movementY * 0.002),
      );
      pitchRef.current = pitch.current;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!isLocked.current) {
        requestLock();
        return;
      }
      if (e.button === 2) isAiming.current = true;
      if (e.button === 0) {
        isShooting.current = true;
        if (weapon) setFiringState(!isFiring);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) isAiming.current = false;
      if (e.button === 0) isShooting.current = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") isLocked.current = false;
    };

    canvas.addEventListener("click", requestLock);
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    return () => {
      canvas.removeEventListener("click", requestLock);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, weapon, isFiring]);

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

    // ── Body ALWAYS faces camera yaw — not just when moving ──────────────────
    // This keeps the gun arm and player orientation in sync with where you're aiming.
    if (meshGroupRef.current) {
      const targetYaw = yaw.current + Math.PI; // +PI because model faces -Z by default
      meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        meshGroupRef.current.rotation.y,
        targetYaw,
        1 - Math.exp(-16 * delta), // snappy but smooth
      );
    }

    const freshVel = rb.linvel();
    if (jump && Math.abs(freshVel.y) < 0.05) {
      rb.setLinvel({ x: freshVel.x, y: JUMP_VEL, z: freshVel.z }, true);
    }

    const t = rb.translation();
    playerPositionRef.current.set(t.x, t.y, t.z);

    // ── Camera ──────────────────────────────────────────────────
    const targetDist = isAiming.current ? CAM_DIST_ADS : CAM_DIST;
    const targetFov = isAiming.current ? FOV_ADS : FOV_DEFAULT;
    currentFov.current = THREE.MathUtils.lerp(
      currentFov.current,
      targetFov,
      ADS_LERP,
    );
    (camera as THREE.PerspectiveCamera).fov = currentFov.current;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

    _lookAt.lerp(
      new THREE.Vector3(t.x, t.y + CAM_HEIGHT, t.z),
      1 - Math.exp(-12 * delta),
    );
    _camPos.set(
      t.x - Math.sin(yaw.current) * Math.cos(pitch.current) * targetDist,
      t.y + Math.sin(pitch.current) * targetDist + CAM_HEIGHT,
      t.z - Math.cos(yaw.current) * Math.cos(pitch.current) * targetDist,
    );
    camera.position.lerp(_camPos, 1 - Math.exp(-10 * delta));
    camera.lookAt(_lookAt);

    // ── Net sync ────────────────────────────────────────────────
    const now = performance.now();
    if (player && now - lastNetSync.current > NET_SYNC_INTERVAL_MS) {
      player.setState("position", [t.x, t.y, t.z], false);
      player.setState("yaw", yaw.current, false);
      player.setState("pitch", pitch.current, false);
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
        aimPitch={pitchRef}
        isAiming={isAiming}
        playerPositionRef={playerPositionRef}
      />
    </RigidBody>
  );
}
