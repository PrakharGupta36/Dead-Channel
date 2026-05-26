"use client";

import Guns from "@/components/models/Guns";
import { Controls } from "@/lib/controls";
import { Html, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { myPlayer, usePlayerState, usePlayersList } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import EquippedWeapon from "../weapons/EquippedWeapon";

const COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#ffe66d",
  "#a29bfe",
  "#feca57",
  "#48dbfb",
];

const SPAWN_Y = 2;
const SPAWN_RADIUS = 36;

const SPAWN_POSITIONS: [number, number, number][] = [
  [SPAWN_RADIUS, SPAWN_Y, SPAWN_RADIUS],
  [-SPAWN_RADIUS, SPAWN_Y, SPAWN_RADIUS],
  [SPAWN_RADIUS, SPAWN_Y, -SPAWN_RADIUS],
  [-SPAWN_RADIUS, SPAWN_Y, -SPAWN_RADIUS],
  [SPAWN_RADIUS * 1.8, SPAWN_Y, 0],
  [-SPAWN_RADIUS * 1.8, SPAWN_Y, 0],
  [0, SPAWN_Y, SPAWN_RADIUS * 1.8],
  [0, SPAWN_Y, -SPAWN_RADIUS * 1.8],
];

const WALK_SPEED = 8;
const RUN_SPEED = 14;
const JUMP_VEL = 10;

const CAM_DIST = 8;
const CAM_HEIGHT = 1.2;

const _moveDir = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

const _camPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

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

  const [weapon] = usePlayerState(player, "weapon", null);

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
    const me = player?.id;

    const ordered = [...players].sort((a, b) => a.id.localeCompare(b.id));

    const myIndex = me ? ordered.findIndex((p) => p.id === me) : -1;

    if (myIndex >= 0) {
      return SPAWN_POSITIONS[myIndex % 4];
    }

    const fallback = me
      ? Array.from(me).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
      : 0;

    return SPAWN_POSITIONS[fallback % 4];
  });

  const [health] = useState(100);

  // CAMERA DRAG CONTROLS
  useEffect(() => {
    let dragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        dragging = true;
      }
    };

    const handleMouseUp = () => {
      dragging = false;
    };

    const handleMouseLeave = () => {
      dragging = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;

      yaw.current -= e.movementX * 0.005;

      pitch.current += e.movementY * 0.003;

      pitch.current = Math.max(0.2, Math.min(1.2, pitch.current));
    };

    window.addEventListener("mousedown", handleMouseDown);

    window.addEventListener("mouseup", handleMouseUp);

    window.addEventListener("mouseleave", handleMouseLeave);

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);

      window.removeEventListener("mouseup", handleMouseUp);

      window.removeEventListener("mouseleave", handleMouseLeave);

      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // INITIAL PLAYER STATE
  useEffect(() => {
    if (!player) return;

    player.setState("health", health);
    player.setState("color", color);
    player.setState("name", playerName);
  }, [player, color, playerName, health]);

  useFrame((_, delta) => {
    const rb = rbRef.current;

    if (!rb) return;

    const { forward, backward, leftward, rightward, jump, run } = getKeys();

    const speed = run ? RUN_SPEED : WALK_SPEED;

    // CAMERA DIRECTION
    _camFwd.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();

    _camRight.crossVectors(_camFwd, _up).normalize();

    // MOVEMENT
    _moveDir.set(0, 0, 0);

    if (forward) _moveDir.add(_camFwd);

    if (backward) _moveDir.sub(_camFwd);

    if (rightward) _moveDir.add(_camRight);

    if (leftward) _moveDir.sub(_camRight);

    if (_moveDir.lengthSq() > 0) {
      _moveDir.normalize();
    }

    const vel = rb.linvel();

    const targetVelX = _moveDir.x * speed;

    const targetVelZ = _moveDir.z * speed;

    const nextVelX = THREE.MathUtils.lerp(vel.x, targetVelX, 0.18);

    const nextVelZ = THREE.MathUtils.lerp(vel.z, targetVelZ, 0.18);

    rb.setLinvel(
      {
        x: nextVelX,
        y: vel.y,
        z: nextVelZ,
      },
      true,
    );

    // ROTATION
    if (_moveDir.lengthSq() > 0.001 && meshGroupRef.current) {
      const angle = Math.atan2(_moveDir.x, _moveDir.z);

      meshGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        meshGroupRef.current.rotation.y,
        angle,
        0.18,
      );
    }

    // JUMP
    if (jump && Math.abs(vel.y) < 0.05) {
      rb.setLinvel(
        {
          x: nextVelX,
          y: JUMP_VEL,
          z: nextVelZ,
        },
        true,
      );
    }

    // CAMERA
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

    // NETWORK SYNC
    const now = performance.now();

    if (player && now - lastNetSync.current > 80) {
      player.setState("position", [t.x, t.y, t.z], false);

      lastNetSync.current = now;
    }
  });

  if (!player) return null;

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

      <group ref={meshGroupRef}>
        {/* PLAYER */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.5, 1]} />

          <meshStandardMaterial color={color} />
        </mesh>

        {/* WEAPON */}
        {weapon && <EquippedWeapon weapon={weapon} isLocal />}

        {/* UI */}
        <Html position={[0, 2.2, 0]} center distanceFactor={10} occlude>
          <div className="pointer-events-none relative top-8 select-none">
            <div
              className="mb-1 text-center text-xs font-bold drop-shadow"
              style={{ color }}
            >
              {playerName}

              <span className="font-normal opacity-60"> (You)</span>
            </div>

            <div className="h-3 w-24 overflow-hidden rounded-full border border-black/40 bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-300"
                style={{
                  width: `${health}%`,
                }}
              />
            </div>
          </div>
        </Html>
      </group>
    </RigidBody>
  );
}
