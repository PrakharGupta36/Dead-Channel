/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { myPlayer, usePlayerState } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import PlayerBody from "./shared/PlayerBody";

const FOV_DEFAULT = 45;
const FOV_ADS = 30;
const ADS_LERP = 0.12;
const CAM_DIST_ADS = CAM_DIST * 0.6;

export default function LocalPlayer() {
  const player = myPlayer();
  // const players = usePlayersList();

  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const lastNetSync = useRef(0);

  const { gl } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  const yaw = useRef(Math.PI);
  const pitch = useRef(0.3);
  const isAiming = useRef(false);
  const isShooting = useRef(false);
  const currentFov = useRef(FOV_DEFAULT);
  const isLocked = useRef(false);
  const pitchRef = useRef(0.3);

  const playerPositionRef = useRef(new THREE.Vector3());
  const [isMoving, setIsMoving] = useState(false);

  const [weapon] = usePlayerState(player, "weapon", null);
  const [customName] = usePlayerState(player, "customName", null);
  const [isFiring, setFiringState] = usePlayerState(player, "firing", false);

  const [color] = useState(
    () => COLORS[Math.floor(Math.random() * COLORS.length)],
  );

  // ── Updated Random Spawn Position Logic ───────────────────────
  const [spawnPosition] = useState<[number, number, number]>(() => {
    const randomIndex = Math.floor(Math.random() * SPAWN_POSITIONS.length);
    return SPAWN_POSITIONS[randomIndex];
  });

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
  }, [gl, weapon, isFiring, setFiringState]);

  const [health] = usePlayerState(player, "health", 100);

  useEffect(() => {
    if (!player) return;
    if (player.getState("health") === undefined) {
      player.setState("health", 100);
    }
    player.setState("color", color);
    const displayName = customName ?? player.getProfile().name;
    player.setState("name", displayName);
  }, [player, color, customName]);

  useFrame((state, delta) => {
    const rb = rbRef.current;
    if (!rb) return;

    const syncedPos = player.getState("position");
    const t = rb.translation();

    if (syncedPos && Array.isArray(syncedPos)) {
      const distToSynced = new THREE.Vector3(t.x, t.y, t.z).distanceTo(
        new THREE.Vector3(syncedPos[0], syncedPos[1], syncedPos[2]),
      );

      if (distToSynced > 4.0) {
        rb.setTranslation(
          { x: syncedPos[0], y: syncedPos[1], z: syncedPos[2] },
          true,
        );
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        return;
      }
    }

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

    const hasInput = forward || backward || leftward || rightward;
    const isGrounded = Math.abs(vel.y) < 0.05;
    const movingNow = hasInput && isGrounded;
    if (isMoving !== movingNow) setIsMoving(movingNow);

    if (meshGroupRef.current) {
      const targetYaw = yaw.current + Math.PI;
      meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        meshGroupRef.current.rotation.y,
        targetYaw,
        1 - Math.exp(-16 * delta),
      );
    }

    const freshVel = rb.linvel();
    if (jump && Math.abs(freshVel.y) < 0.05) {
      rb.setLinvel({ x: freshVel.x, y: JUMP_VEL, z: freshVel.z }, true);
    }

    playerPositionRef.current.set(t.x, t.y, t.z);

    const targetDist = isAiming.current ? CAM_DIST_ADS : CAM_DIST;
    const targetFov = isAiming.current ? FOV_ADS : FOV_DEFAULT;
    currentFov.current = THREE.MathUtils.lerp(
      currentFov.current,
      targetFov,
      ADS_LERP,
    );

    const camera = state.camera as THREE.PerspectiveCamera;
    camera.fov = currentFov.current;
    camera.updateProjectionMatrix();

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
      userData={{ playerId: player.id }}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <PlayerBody
        ref={meshGroupRef}
        color={color}
        playerId={player.id}
        displayName={displayName}
        health={health}
        weapon={weapon}
        isLocal
        aimPitch={pitchRef}
        isAiming={isAiming}
        playerPositionRef={playerPositionRef}
        isMoving={isMoving}
      />
    </RigidBody>
  );
}

