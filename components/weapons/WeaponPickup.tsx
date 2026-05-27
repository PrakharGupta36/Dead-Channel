/* eslint-disable react-hooks/purity */
"use client";

import Guns from "@/components/models/Guns";
import { WeaponType } from "@/lib/weapons";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { AnimatePresence, motion } from "framer-motion";
import { myPlayer } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PICKUP_DISTANCE = 4;
const LOD_DISTANCE = 28;
const FLOAT_SPEED = 0.8;
const FLOAT_AMPLITUDE = 0.18;

const GUN_SCALES: Record<WeaponType, number> = {
  pistol: 0.4,
  smg: 0.7,
  ak47: 0.7,
};

const GUN_OFFSETS: Record<WeaponType, [number, number, number]> = {
  pistol: [0, -1, 0],
  smg: [0, -0.5, 0],
  ak47: [0, -0.5, 0],
};

const GUN_INNER_POSITIONS: Record<WeaponType, [number, number, number]> = {
  pistol: [-0.8, -1.8, 5.8],
  smg: [-0.7, -2, 0],
  ak47: [-0.8, -0.5, 0],
};

const GUN_INNER_SCALES: Record<WeaponType, number> = {
  pistol: 0.9,
  smg: 0.7,
  ak47: 0.7,
};

const TEXT_COLORS: Record<WeaponType, string> = {
  smg: "text-[#00d2ff]",
  ak47: "text-[#ff9500]",
  pistol: "text-[#ff4fd8]",
};

const _playerPos = new THREE.Vector3();
const _pickupPos = new THREE.Vector3();

type WeaponPickupProps = {
  id: string;
  type: WeaponType;
  position: [number, number, number];
  onPickup: (id: string) => void;
};

export default function WeaponPickup({
  id,
  type,
  position,
  onPickup,
}: WeaponPickupProps) {
  const player = myPlayer();
  const [showPrompt, setShowPrompt] = useState(false);
  const [withinLOD, setWithinLOD] = useState(false);
  const lodCheckRef = useRef(0);

  // Keyboard capture configuration
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e") return;
      if (!showPrompt || !player) return;
      player.setState("weapon", type);
      onPickup(id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, type, id, onPickup, showPrompt]);

  useFrame(() => {
    if (!player) return;
    const playerPosition = player.getState("position");
    if (!Array.isArray(playerPosition)) return;

    _playerPos.set(playerPosition[0], playerPosition[1], playerPosition[2]);
    _pickupPos.set(position[0], position[1], position[2]);
    const dist = _playerPos.distanceTo(_pickupPos);

    // Track real-time close contact trigger criteria
    const isClose = dist < PICKUP_DISTANCE;
    if (isClose !== showPrompt) {
      setShowPrompt(isClose);
    }

    // Throttle complex vector checks down to 1 out of 20 game cycle loops
    lodCheckRef.current++;
    if (lodCheckRef.current % 20 === 0) {
      const shouldShowMesh = dist < LOD_DISTANCE;
      if (shouldShowMesh !== withinLOD) {
        setWithinLOD(shouldShowMesh);
      }
    }
  });

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1, 1, 1]} />
      </RigidBody>

      {/* Render 3D geometric asset data conditionally based on mesh range thresholds */}
      {withinLOD && <FloatingGun type={type} />}

      {/* Embedded UI overlay tracking managed via Framer Motion */}
      <Html fullscreen style={{ pointerEvents: "none", zIndex: 9999 }}>
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-24 select-none">
          <AnimatePresence>
            {showPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 bg-zinc-950/85 text-white shadow-2xl backdrop-blur-md"
              >
                <span className="text-sm font-medium tracking-wide">Press</span>
                <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 font-mono text-xs font-bold text-emerald-400 shadow-sm">
                  E
                </kbd>
                <span className="text-sm font-medium tracking-wide">
                  to equip
                </span>
                <span
                  className={`text-sm font-black uppercase tracking-wider ${TEXT_COLORS[type]}`}
                >
                  {type}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Html>
    </group>
  );
}

function FloatingGun({ type }: { type: WeaponType }) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.y =
      Math.sin(t * FLOAT_SPEED + phaseRef.current) * FLOAT_AMPLITUDE;
    g.rotation.y = t * 0.4;
  });

  return (
    <group ref={groupRef} scale={GUN_SCALES[type]} position={GUN_OFFSETS[type]}>
      <Guns
        position={GUN_INNER_POSITIONS[type]}
        type={type}
        scale={GUN_INNER_SCALES[type]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}
