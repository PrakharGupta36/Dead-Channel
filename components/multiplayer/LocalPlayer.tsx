"use client";

import { Controls } from "@/lib/controls";
import { Html, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { myPlayer } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#ffe66d",
  "#a29bfe",
  "#feca57",
  "#48dbfb",
];

const SPAWN_Y = 3;
const SPAWN_POSITIONS: [number, number, number][] = [
  [0, SPAWN_Y, 0],
  [3, SPAWN_Y, 0],
  [-3, SPAWN_Y, 0],
  [0, SPAWN_Y, 3],
  [0, SPAWN_Y, -3],
  [3, SPAWN_Y, 3],
  [-3, SPAWN_Y, -3],
];

const MOVE_SPEED = 6;
const JUMP_VEL = 7;
const CAM_DIST = 5; // distance behind player
const CAM_HEIGHT = 1.2; // look-at height above rb origin

// Module-scope reusables — zero allocation inside useFrame
const _moveDir = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _camPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

export default function LocalPlayer() {
  const player = myPlayer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rbRef = useRef<any>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const isGrounded = useRef(false);
  const initialized = useRef(false);

  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  // Camera angles — mutated directly in mousemove, read in useFrame
  const yaw = useRef(Math.PI); // start facing toward camera (behind player)
  const pitch = useRef(0.3); // slight downward angle

  const [color] = useState(
    () => COLORS[Math.floor(Math.random() * COLORS.length)],
  );
  const [playerName] = useState(() => {
    const adj = ["Swift", "Bold", "Calm", "Fierce", "Sly", "Brave"];
    const noun = ["Fox", "Wolf", "Bear", "Eagle", "Tiger", "Hawk"];
    return (
      adj[Math.floor(Math.random() * adj.length)] +
      noun[Math.floor(Math.random() * noun.length)]
    );
  });
  const [spawnPosition] = useState<[number, number, number]>(() => {
    return SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
  });
  const [health] = useState(100);

  useEffect(() => {
    // Track when pointer lock was last exited — browser enforces a cooldown
    // between exit and re-acquisition (varies: ~500ms–1s depending on browser)
    let lastExitTime = 0;
    const LOCK_COOLDOWN_MS = 1000;

    const lock = () => {
      // Already locked — nothing to do
      if (document.pointerLockElement === document.body) return;
      // Too soon after exit — browser will throw, skip silently
      if (performance.now() - lastExitTime < LOCK_COOLDOWN_MS) return;
      document.body.requestPointerLock();
    };

    const onLockChange = () => {
      if (document.pointerLockElement !== document.body) {
        // Record the moment we lost the lock
        lastExitTime = performance.now();
      }
    };

    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== document.body) return;
      yaw.current -= e.movementX * 0.004;
      pitch.current = Math.max(
        0.05,
        Math.min(1.1, pitch.current + e.movementY * 0.004),
      );
    };

    document.addEventListener("click", lock);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      document.removeEventListener("click", lock);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onLockChange);
    };
  }, []);

  useEffect(() => {
    if (!player) return;
    player.setState("health", health);
    player.setState("color", color);
    player.setState("name", playerName);
  }, [player, color, playerName, health]);

  useFrame(() => {
    const rb = rbRef.current;
    if (!rb) return;

    const { forward, backward, leftward, rightward, jump } = getKeys();
    const anyMoving = forward || backward || leftward || rightward;

    // ── Derive camera axes from current yaw/pitch ────────────────────────
    // Camera forward (XZ only, for movement)
    _camFwd.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
    _camRight.crossVectors(_camFwd, _up).normalize();

    // ── Movement relative to camera facing ───────────────────────────────
    _moveDir.set(0, 0, 0);
    if (forward) _moveDir.add(_camFwd);
    if (backward) _moveDir.sub(_camFwd);
    if (rightward) _moveDir.add(_camRight);
    if (leftward) _moveDir.sub(_camRight);

    const vel = rb.linvel();

    if (anyMoving) {
      if (_moveDir.lengthSq() > 0) _moveDir.normalize();
      rb.setLinvel(
        { x: _moveDir.x * MOVE_SPEED, y: vel.y, z: _moveDir.z * MOVE_SPEED },
        true,
      );
      // Rotate mesh toward movement direction
      if (meshGroupRef.current) {
        const angle = Math.atan2(_moveDir.x, _moveDir.z);
        meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          meshGroupRef.current.rotation.y,
          angle,
          0.2,
        );
      }
    } else {
      rb.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    }

    // ── Jump ──────────────────────────────────────────────────────────────
    if (jump && isGrounded.current) {
      rb.setLinvel({ x: vel.x, y: JUMP_VEL, z: vel.z }, true);
      isGrounded.current = false;
    }

    // ── Camera — NO lerp, snap directly to computed position ─────────────
    const t = rb.translation();

    // Spherical offset — camera orbits around player
    _camPos.set(
      t.x - Math.sin(yaw.current) * Math.cos(pitch.current) * CAM_DIST,
      t.y + Math.sin(pitch.current) * CAM_DIST + CAM_HEIGHT * 0.5,
      t.z - Math.cos(yaw.current) * Math.cos(pitch.current) * CAM_DIST,
    );

    _lookAt.set(t.x, t.y + CAM_HEIGHT, t.z);

    if (!initialized.current) {
      // Hard-set on first frame — no lerp-in from origin
      camera.position.copy(_camPos);
      initialized.current = true;
    } else {
      // Tiny lerp only to smooth out physics jitter (not camera input lag)
      // alpha=0.85 → snappy but not pixel-jittery
      camera.position.lerp(_camPos, 0.85);
    }

    camera.lookAt(_lookAt);

    // ── Playroomkit sync ──────────────────────────────────────────────────
    if (player) player.setState("position", [t.x, t.y, t.z]);
  });

  if (!player) return null;

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      position={spawnPosition}
      enabledRotations={[false, false, false]}
      linearDamping={0}
      angularDamping={0}
      onCollisionEnter={({ other }) => {
        const otherY = other.rigidBody?.translation().y ?? 0;
        const myY = rbRef.current?.translation().y ?? 999;
        if (otherY < myY) isGrounded.current = true;
      }}
    >
      <CapsuleCollider args={[0.5, 0.5]} />

      <group ref={meshGroupRef}>
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>

        <Html position={[0, 2.2, 0]} center distanceFactor={10} occlude>
          <div className="pointer-events-none select-none">
            <div
              className="mb-1 text-center text-xs font-bold drop-shadow"
              style={{ color }}
            >
              {playerName} <span className="opacity-60 font-normal">(You)</span>
            </div>
            <div className="h-3 w-24 overflow-hidden rounded-full border border-black/40 bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-300"
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
        </Html>
      </group>
    </RigidBody>
  );
}
