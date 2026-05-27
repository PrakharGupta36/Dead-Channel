"use client";

import Guns from "@/components/models/Guns";
import { getTerrainHeight } from "@/components/scene/Ground";
import { WeaponType } from "@/lib/weapons";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { AnimatePresence, motion } from "framer-motion";
import { myPlayer } from "playroomkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────
// Constants & Lookups
// ─────────────────────────────────────────────
const MAP_LIMIT = 60;
const MIN_DISTANCE = 14;
const WEAPON_COUNT = 20;
const PICKUP_DISTANCE = 4;
const LOD_DISTANCE = 28;
const LOD_DISTANCE_SQ = LOD_DISTANCE * LOD_DISTANCE;
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
  pistol: [0, -4, 0],
  smg: [-0.7, -2, 0],
  ak47: [-0.8, -2, 0],
};
const GUN_INNER_SCALES: Record<WeaponType, number> = {
  pistol: 0.9,
  smg: 0.7,
  ak47: 0.7,
};

type SpawnedWeapon = {
  id: string;
  type: WeaponType;
  position: [number, number, number];
  phase: number;
};

function generateWeapons(): SpawnedWeapon[] {
  const positions: [number, number, number][] = [];
  const weapons: SpawnedWeapon[] = [];
  let seed = 1337;

  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const seededPos = (): [number, number, number] => {
    const x = (random() - 0.5) * MAP_LIMIT * 2;
    const z = (random() - 0.5) * MAP_LIMIT * 2;
    return [x, getTerrainHeight(x, z) + 2, z];
  };

  const farEnough = (
    p: [number, number, number],
    others: [number, number, number][],
  ) => {
    const px = p[0],
      pz = p[2];
    for (let i = 0; i < others.length; i++) {
      const o = others[i];
      const dx = px - o[0];
      const dz = pz - o[2];
      if (dx * dx + dz * dz <= MIN_DISTANCE * MIN_DISTANCE) return false;
    }
    return true;
  };

  for (let i = 0; i < WEAPON_COUNT; i++) {
    let pos: [number, number, number];
    let attempts = 0;
    do {
      pos = seededPos();
      attempts++;
    } while (!farEnough(pos, positions) && attempts < 100);

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
// Shared Subsystem Execution
// ─────────────────────────────────────────────

function ProximityAndLODSystem({
  weapons,
  aliveSet,
  lightRef,
  htmlGroupRef,
  setActivePromptId,
  onPickup,
}: {
  weapons: SpawnedWeapon[];
  aliveSet: React.MutableRefObject<Set<string>>;
  lightRef: React.RefObject<THREE.PointLight | null>;
  htmlGroupRef: React.RefObject<THREE.Group | null>;
  setActivePromptId: (id: string | null) => void;
  onPickup: (id: string) => void;
}) {
  const player = myPlayer();
  const nearbyIdRef = useRef<string | null>(null);
  const weaponRefs = useRef<Record<string, THREE.Group>>({});

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
    const t = clock.elapsedTime;
    const currentAlive = aliveSet.current;

    // 1. ANIMATE ALL ALIVE MESHES & COMPUTE UNIFIED LOD IN ONE PASS
    const playerPosition = player?.getState("position");
    const hasPlayer = Array.isArray(playerPosition);
    const px = hasPlayer ? playerPosition[0] : 0;
    const pz = hasPlayer ? playerPosition[2] : 0;

    let closestDistSq = Infinity;
    let closestWeapon: SpawnedWeapon | null = null;

    for (let i = 0; i < weapons.length; i++) {
      const w = weapons[i];
      const meshGroup = weaponRefs.current[w.id];
      if (!meshGroup) continue;

      if (!currentAlive.has(w.id)) {
        meshGroup.visible = false;
        continue;
      }

      // Continuous Rotation & Floating Calculations
      const floatingElement = meshGroup.children[0];
      if (floatingElement) {
        floatingElement.position.y =
          Math.sin(t * FLOAT_SPEED + w.phase) * FLOAT_AMPLITUDE;
        floatingElement.rotation.y = t * 0.4;
      }

      // LOD Check performed every frame directly via scene property manipulation (Zero-state overhead)
      if (hasPlayer) {
        const dx = w.position[0] - px;
        const dz = w.position[2] - pz;
        const distSq = dx * dx + dz * dz;

        meshGroup.visible = distSq < LOD_DISTANCE_SQ;

        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestWeapon = w;
        }
      }
    }

    const closestDist = Math.sqrt(closestDistSq);

    // 2. POSITION POINT LIGHT AND HTML ANCHOR GRAPHICS
    const light = lightRef.current;
    if (light && closestWeapon) {
      if (closestDist < 14) {
        const ly =
          closestWeapon.position[1] +
          Math.sin(t * FLOAT_SPEED + closestWeapon.phase) * FLOAT_AMPLITUDE;
        light.position.set(
          closestWeapon.position[0],
          ly + 0.5,
          closestWeapon.position[2],
        );
        light.color.copy(GLOW_COLORS[closestWeapon.type]);
        light.intensity = (14 - closestDist) * 0.8;
      } else {
        light.intensity = 0;
      }
    }

    // Process UI prompts matrix adjustments synchronously
    const currentNearbyId =
      closestWeapon && closestDist < PICKUP_DISTANCE ? closestWeapon.id : null;
    if (currentNearbyId !== nearbyIdRef.current) {
      nearbyIdRef.current = currentNearbyId;
      setActivePromptId(currentNearbyId);
    }

    const htmlGroup = htmlGroupRef.current;
    if (htmlGroup && closestWeapon && currentNearbyId) {
      htmlGroup.position.set(
        closestWeapon.position[0],
        closestWeapon.position[1] + 0.5,
        closestWeapon.position[2],
      );
    }
  });

  return (
    <group>
      {weapons.map((w) => (
        <group
          key={w.id}
          position={w.position}
          ref={(el) => {
            if (el) weaponRefs.current[w.id] = el;
          }}
        >
          <group scale={GUN_SCALES[w.type]} position={GUN_OFFSETS[w.type]}>
            <Guns
              position={GUN_INNER_POSITIONS[w.type]}
              type={w.type}
              scale={GUN_INNER_SCALES[w.type]}
              rotation={[0, Math.PI / 2, 0]}
            />
          </group>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────
// Master Container Component
// ─────────────────────────────────────────────

interface WeaponSpawnerProps {
  active: boolean;
}

export default function WeaponSpawner({ active }: WeaponSpawnerProps) {
  const [weapons] = useState<SpawnedWeapon[]>(generateWeapons);
  const [aliveIds, setAliveIds] = useState<Set<string>>(
    () => new Set(weapons.map((w) => w.id)),
  );
  const [activePromptId, setActivePromptId] = useState<string | null>(null);

  const aliveSetRef = useRef<Set<string>>(aliveIds);
  const lightRef = useRef<THREE.PointLight>(null);
  const htmlGroupRef = useRef<THREE.Group>(null);

  const handlePickup = useCallback((id: string) => {
    const nextSet = new Set(aliveSetRef.current);
    nextSet.delete(id);
    aliveSetRef.current = nextSet;
    setAliveIds(nextSet);
    setActivePromptId((prev) => (prev === id ? null : prev));
  }, []);

  const activeWeaponData = useMemo(() => {
    if (!activePromptId) return null;
    return weapons.find((w) => w.id === activePromptId) || null;
  }, [activePromptId, weapons]);

  if (!active) return null;

  return (
    <>
      <pointLight ref={lightRef} distance={10} intensity={0} />

      {/* 1. INSTANCED SINGLE RIGID BODY SYSTEM WITH COMPOUND COLLIDERS 
          Reduces physics mesh validation overhead down to a single entity hook */}
      <RigidBody type="fixed" colliders={false}>
        {weapons.map((w) => {
          if (!aliveIds.has(w.id)) return null;
          return (
            <CuboidCollider
              key={`col-${w.id}`}
              position={w.position}
              args={[1, 1, 1]}
            />
          );
        })}
      </RigidBody>

      {/* Combined System managing LOD and positions simultaneously */}
      <ProximityAndLODSystem
        weapons={weapons}
        aliveSet={aliveSetRef}
        lightRef={lightRef}
        htmlGroupRef={htmlGroupRef}
        setActivePromptId={setActivePromptId}
        onPickup={handlePickup}
      />

      {/* TRANSFORM HOISTED GRAPHICS WRAPPER PROMPT */}
      <group ref={htmlGroupRef}>
        {activeWeaponData && (
          <Html
            center
            distanceFactor={8}
            style={{ pointerEvents: "none", zIndex: 9999 }}
          >
            <div
              className={`select-none pointer-events-none origin-center whitespace-nowrap relative ${
                activeWeaponData.type === "pistol" ? "top-30" : "top-19 left-10"
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeWeaponData.id}
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: 10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-zinc-950/90 text-white shadow-xl backdrop-blur-md"
                >
                  <span className="text-xs font-medium tracking-wide">
                    Press
                  </span>
                  <kbd className="inline-flex h-5 items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 font-mono text-[10px] font-bold text-emerald-400 shadow-sm">
                    E
                  </kbd>
                  <span className="text-xs font-medium tracking-wide">
                    to equip
                  </span>
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${TEXT_COLORS[activeWeaponData.type]}`}
                  >
                    {activeWeaponData.type}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
