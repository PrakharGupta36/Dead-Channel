/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/refs */
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

// ── Spawn slot tracking: shared across all local instances in this tab ────────
// Keeps a set of recently-claimed spawn indices so respawns don't stack.
// Slots are released after 8 s so they can be reused in large matches.
const _claimedSlots = new Map<number, number>(); // slotIndex → claimedAt ms

function claimSpawnSlot(): [number, number, number] {
  const now = performance.now();

  // Release slots older than 8 s
  for (const [idx, claimedAt] of _claimedSlots) {
    if (now - claimedAt > 8_000) _claimedSlots.delete(idx);
  }

  // Build a shuffled list of all slot indices
  const indices = Array.from({ length: SPAWN_POSITIONS.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Pick the first unclaimed slot; fall back to any random slot
  let chosen = indices[0];
  for (const idx of indices) {
    if (!_claimedSlots.has(idx)) {
      chosen = idx;
      break;
    }
  }

  _claimedSlots.set(chosen, now);
  return SPAWN_POSITIONS[chosen] as [number, number, number];
}

// ── Pre-allocated scratch vectors to eliminate per-frame heap allocation ──────
const _lookAtTarget = new THREE.Vector3();

export default function LocalPlayerController() {
  const player = myPlayer();
  const [health] = usePlayerState(player, "health", 100);
  const [respawnKey, setRespawnKey] = useState(0);
  const prevHealthRef = useRef(health);

  useEffect(() => {
    if (prevHealthRef.current === 0 && (health as number) > 0) {
      setRespawnKey((prev) => prev + 1);
    }
    prevHealthRef.current = health as number;
  }, [health]);

  if (!player) return null;

  return (
    <LocalPlayerInstance
      key={respawnKey}
      player={player}
      health={health as number}
    />
  );
}

interface InstanceProps {
  player: any;
  health: number;
}

function LocalPlayerInstance({ player, health }: InstanceProps) {
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);

  const mountTimeRef = useRef(performance.now());
  const lastNetSync = useRef(performance.now());

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

  // ── isMoving: driven by a ref in useFrame; only setState when it flips ───
  const isMovingRef = useRef(false);
  const [isMoving, setIsMoving] = useState(false);

  const [weapon] = usePlayerState(player, "weapon", null);
  const [customName] = usePlayerState(player, "customName", null);
  const [isFiring, setFiringState] = usePlayerState(player, "firing", false);

  // ── Spawn shield: 5-second invincibility window ───────────────────────────
  const [, setSpawnShield] = usePlayerState(player, "spawnShield", false);
  const shieldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [color] = useState(
    () => COLORS[Math.floor(Math.random() * COLORS.length)],
  );

  // 🎲 Claim a unique spawn slot once per instance lifetime
  const initialSpawnCoordinates = useRef<[number, number, number] | null>(null);
  if (initialSpawnCoordinates.current === null) {
    initialSpawnCoordinates.current = claimSpawnSlot();
  }

  // ── Force physics to the claimed spawn position on mount ─────────────────
  useEffect(() => {
    if (!rbRef.current || !player) return;

    const spawnTarget = initialSpawnCoordinates.current!;

    rbRef.current.setTranslation(
      { x: spawnTarget[0], y: spawnTarget[1], z: spawnTarget[2] },
      true,
    );
    rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);

    player.setState(
      "position",
      [spawnTarget[0], spawnTarget[1], spawnTarget[2]],
      true,
    );

    mountTimeRef.current = performance.now();

    // ── Activate spawn shield ─────────────────────────────────────────────
    setSpawnShield(true);
    if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    shieldTimerRef.current = setTimeout(() => {
      setSpawnShield(false);
      shieldTimerRef.current = null;
    }, 5_000);

    return () => {
      if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // ── Pointer Lock & Mouse Listeners ───────────────────────────────────────
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

  // ── Profile Registration ──────────────────────────────────────────────────
  useEffect(() => {
    player.setState("color", color);
    const displayName = customName ?? player.getProfile().name;
    player.setState("name", displayName);
  }, [player, color, customName]);

  // ── Core Game Loop ────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const rb = rbRef.current;
    if (!rb) return;

    if (health <= 0) return;

    const syncedPos = player.getState("position");
    const t = rb.translation();

    const timeSinceMount = performance.now() - mountTimeRef.current;

    if (syncedPos && Array.isArray(syncedPos) && timeSinceMount > 800) {
      const dx = t.x - syncedPos[0];
      const dy = t.y - syncedPos[1];
      const dz = t.z - syncedPos[2];
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq > 16) {
        // 4.0² — avoids sqrt
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

    // Only trigger React re-render when state actually flips
    if (movingNow !== isMovingRef.current) {
      isMovingRef.current = movingNow;
      setIsMoving(movingNow);
    }

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

    // ── Reuse pre-allocated scratch vector; no `new THREE.Vector3()` per frame
    _lookAtTarget.set(t.x, t.y + CAM_HEIGHT, t.z);
    _lookAt.lerp(_lookAtTarget, 1 - Math.exp(-12 * delta));

    _camPos.set(
      t.x - Math.sin(yaw.current) * Math.cos(pitch.current) * targetDist,
      t.y + Math.sin(pitch.current) * targetDist + CAM_HEIGHT,
      t.z - Math.cos(yaw.current) * Math.cos(pitch.current) * targetDist,
    );
    camera.position.lerp(_camPos, 1 - Math.exp(-10 * delta));
    camera.lookAt(_lookAt);

    // Network sync
    const now = performance.now();
    if (
      now - lastNetSync.current > NET_SYNC_INTERVAL_MS &&
      timeSinceMount > 800
    ) {
      player.setState("position", [t.x, t.y, t.z], false);
      player.setState("yaw", yaw.current, false);
      player.setState("pitch", pitch.current, false);
      lastNetSync.current = now;
    }
  });

  const displayName = customName ?? player.getProfile().name ?? "Player";

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      position={initialSpawnCoordinates.current}
      enabledRotations={[false, false, false]}
      linearDamping={4}
      angularDamping={10}
      canSleep={false}
      userData={{ playerId: player.id }}
    >
      <CapsuleCollider args={[0.5, 0.5]} />

      <group visible={health > 0}>
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
      </group>
    </RigidBody>
  );
}
