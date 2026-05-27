"use client";

import Guns from "@/components/models/Guns";
import { WeaponType } from "@/lib/weapons";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { AnimatePresence, motion } from "framer-motion";
import { myPlayer } from "playroomkit";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAP_LIMIT = 60;
const MIN_DISTANCE = 14;
const WEAPON_COUNT = 15;
const PICKUP_DISTANCE = 4;
const LOD_DISTANCE = 28;
const FLOAT_SPEED = 0.8;
const FLOAT_AMPLITUDE = 0.18;

const WEAPON_TYPES: WeaponType[] = ["smg", "ak47", "pistol"];

const GLOW_COLORS: Record<WeaponType, THREE.Color> = {
  smg: new THREE.Color("#00d2ff"),
  ak47: new THREE.Color("#ff9500"),
  pistol: new THREE.Color("#ff4fd8"),
};

const TEXT_COLORS: Record<WeaponType, string> = {
  smg: "text-[#00d2ff]",
  ak47: "text-[#ff9500]",
  pistol: "text-[#ff4fd8]",
};

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
  ak47: [-0.8, 0, 0],
};

const GUN_INNER_SCALES: Record<WeaponType, number> = {
  pistol: 0.9,
  smg: 0.7,
  ak47: 0.7,
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type SpawnedWeapon = {
  id: string;
  type: WeaponType;
  position: [number, number, number];
  phase: number;
};

// ─────────────────────────────────────────────
// Seeded spawn generation
// ─────────────────────────────────────────────

function generateWeapons(): SpawnedWeapon[] {
  const positions: [number, number, number][] = [];
  const weapons: SpawnedWeapon[] = [];
  let seed = 1337;

  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const seededPos = (): [number, number, number] => [
    (random() - 0.5) * MAP_LIMIT * 2,
    2,
    (random() - 0.5) * MAP_LIMIT * 2,
  ];

  const farEnough = (
    p: [number, number, number],
    others: [number, number, number][],
  ) =>
    others.every((o) => {
      const dx = p[0] - o[0];
      const dz = p[2] - o[2];
      return Math.sqrt(dx * dx + dz * dz) > MIN_DISTANCE;
    });

  for (let i = 0; i < WEAPON_COUNT; i++) {
    let pos: [number, number, number];
    do {
      pos = seededPos();
    } while (!farEnough(pos, positions));
    positions.push(pos);

    weapons.push({
      id: `weapon-${i}`,
      type: WEAPON_TYPES[Math.floor(random() * WEAPON_TYPES.length)],
      position: pos,
      phase: random() * Math.PI * 2,
    });
  }

  return weapons;
}

// ─────────────────────────────────────────────
// Re-used frame temporaries
// ─────────────────────────────────────────────

const _playerPos = new THREE.Vector3();

// ─────────────────────────────────────────────
// ProximitySystem (Handles math & sets active ID)
// ─────────────────────────────────────────────

function ProximitySystem({
  weapons,
  aliveSet,
  lightRef,
  activePromptId,
  setActivePromptId,
  onPickup,
}: {
  weapons: SpawnedWeapon[];
  aliveSet: React.MutableRefObject<Set<string>>;
  lightRef: React.RefObject<THREE.PointLight | null>;
  activePromptId: string | null;
  setActivePromptId: (id: string | null) => void;
  onPickup: (id: string) => void;
}) {
  const player = myPlayer();
  const nearbyIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e") return;
      const nid = nearbyIdRef.current;
      if (!nid || !player) return;
      const w = weapons.find((x) => x.id === nid);
      if (!w) return;
      player.setState("weapon", w.type);
      onPickup(nid);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [weapons, player, onPickup]);

  useFrame(({ clock }) => {
    if (!player) return;
    const playerPosition = player.getState("position");
    if (!Array.isArray(playerPosition)) return;

    _playerPos.set(playerPosition[0], playerPosition[1], playerPosition[2]);

    let closestDist = Infinity;
    let closestWeapon: SpawnedWeapon | null = null;

    for (const w of weapons) {
      if (!aliveSet.current.has(w.id)) continue;
      const dx = w.position[0] - _playerPos.x;
      const dz = w.position[2] - _playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < closestDist) {
        closestDist = dist;
        closestWeapon = w;
      }
    }

    // Dynamic point light tracking
    const light = lightRef.current;
    if (light && closestWeapon) {
      const t = clock.elapsedTime;
      const ly =
        closestWeapon.position[1] +
        Math.sin(t * FLOAT_SPEED + closestWeapon.phase) * FLOAT_AMPLITUDE;
      light.position.set(
        closestWeapon.position[0],
        ly + 0.5,
        closestWeapon.position[2],
      );
      light.color.copy(GLOW_COLORS[closestWeapon.type]);
      light.intensity =
        closestDist < 14 ? Math.max(0, (14 - closestDist) * 0.8) : 0;
    }

    const isClose = closestWeapon !== null && closestDist < PICKUP_DISTANCE;
    const currentNearbyId = isClose && closestWeapon ? closestWeapon.id : null;

    if (currentNearbyId !== nearbyIdRef.current) {
      nearbyIdRef.current = currentNearbyId;
      setActivePromptId(currentNearbyId);
    }
  });

  return null;
}

// ─────────────────────────────────────────────
// LOD Gun + Relative 3D HTML Prompt
// ─────────────────────────────────────────────

function LODGun({
  weapon,
  showPrompt,
}: {
  weapon: SpawnedWeapon;
  showPrompt: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const player = myPlayer();
  const [visible, setVisible] = useState(false);
  const frameCountRef = useRef(0);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (g && visible) {
      const t = clock.elapsedTime;
      g.position.y = Math.sin(t * FLOAT_SPEED + weapon.phase) * FLOAT_AMPLITUDE;
      g.rotation.y = t * 0.4;
    }

    frameCountRef.current++;
    if (frameCountRef.current % 30 !== 0 || !player) return;
    const pp = player.getState("position");
    if (!Array.isArray(pp)) return;
    const dx = weapon.position[0] - pp[0];
    const dz = weapon.position[2] - pp[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    setVisible(dist < LOD_DISTANCE);
  });

  if (!visible) return null;

  return (
    <group position={weapon.position}>
      <group
        ref={groupRef}
        scale={GUN_SCALES[weapon.type]}
        position={GUN_OFFSETS[weapon.type]}
      >
        <Guns
          position={GUN_INNER_POSITIONS[weapon.type]}
          type={weapon.type}
          scale={GUN_INNER_SCALES[weapon.type]}
          rotation={[0, Math.PI / 2, 0]}
        />
      </group>

      {/* 3D Projected HUD Text:
        - We removed 'fullscreen' so it positions itself at [0, 1.2, 0] relative to this specific gun.
        - 'center' ensures the div anchors smoothly at its midpoint.
        - 'distanceFactor={8}' scales the text dynamically down if the player steps back so it doesn't look gigantic.
      */}
      <Html
        position={[0, .5, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: "none", zIndex: 9999 }}
      >
        <div className="select-none pointer-events-none origin-center whitespace-nowrap">
          <AnimatePresence>
            {showPrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: 10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-950/90 text-white shadow-xl backdrop-blur-md"
              >
                <span className="text-xs font-medium tracking-wide">Press</span>
                <kbd className="inline-flex h-5 items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 font-mono text-[10px] font-bold text-emerald-400 shadow-sm">
                  E
                </kbd>
                <span className="text-xs font-medium tracking-wide">
                  to equip
                </span>
                <span
                  className={`text-xs font-black uppercase tracking-wider ${TEXT_COLORS[weapon.type]}`}
                >
                  {weapon.type}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Html>
    </group>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function WeaponSpawner() {
  const [weapons] = useState<SpawnedWeapon[]>(generateWeapons);
  const [aliveIds, setAliveIds] = useState<Set<string>>(
    () => new Set(weapons.map((w) => w.id)),
  );
  const [activePromptId, setActivePromptId] = useState<string | null>(null);

  const aliveSetRef = useRef<Set<string>>(aliveIds);
  const lightRef = useRef<THREE.PointLight>(null);

  const handlePickup = useCallback(
    (id: string) => {
      const nextSet = new Set(aliveSetRef.current);
      nextSet.delete(id);
      aliveSetRef.current = nextSet;
      setAliveIds(nextSet);
      if (activePromptId === id) setActivePromptId(null);
    },
    [activePromptId],
  );

  return (
    <>
      {/* 1 shared dynamic weapon illumination point light */}
      <pointLight ref={lightRef} distance={10} intensity={0} />

      {/* Shared interaction tracking system */}
      <ProximitySystem
        weapons={weapons}
        aliveSet={aliveSetRef}
        lightRef={lightRef}
        activePromptId={activePromptId}
        setActivePromptId={setActivePromptId}
        onPickup={handlePickup}
      />

      {/* Physics colliders + LOD mesh processing */}
      {weapons.map((w) => {
        if (!aliveIds.has(w.id)) return null;

        return (
          <group key={w.id}>
            <RigidBody type="fixed" colliders={false} position={w.position}>
              <CuboidCollider args={[1, 1, 1]} />
            </RigidBody>
            <LODGun weapon={w} showPrompt={activePromptId === w.id} />
          </group>
        );
      })}
    </>
  );
}
