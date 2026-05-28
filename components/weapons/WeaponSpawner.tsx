"use client";

import Guns from "@/components/models/Guns";
import { getTerrainHeight } from "@/components/scene/Ground";
import { WeaponType } from "@/lib/weapons";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { AnimatePresence, motion } from "framer-motion";
import { isHost, myPlayer, useMultiplayerState } from "playroomkit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";


const MAP_LIMIT = 60;
const MIN_DISTANCE = 14;
const PICKUP_DISTANCE = 4;
const LOD_DISTANCE = 28;
const LOD_DISTANCE_SQ = LOD_DISTANCE * LOD_DISTANCE;
const FLOAT_SPEED = 0.8;
const FLOAT_AMPLITUDE = 0.18;

// ── Exact weapon pool: 15 pistols, 8 ak47s, 7 smgs ──
const WEAPON_POOL: WeaponType[] = [
  ...Array(15).fill("pistol"),
  ...Array(8).fill("ak47"),
  ...Array(7).fill("smg"),
] as WeaponType[];

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

// ─────────────────────────────────────────────
// Shared World Weapon Type
// ─────────────────────────────────────────────
export type WorldWeapon = {
  id: string;
  type: WeaponType;
  position: [number, number, number];
  phase: number;
  pickedUpBy: string | null; // player id, or null if on ground
};

// ─────────────────────────────────────────────
// Deterministic World Generation (same seed = same layout on all clients)
// ─────────────────────────────────────────────
function generateWorldWeapons(): WorldWeapon[] {
  const positions: [number, number, number][] = [];
  const weapons: WorldWeapon[] = [];
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

  // Shuffle the pool deterministically
  const pool = [...WEAPON_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let i = 0; i < pool.length; i++) {
    let pos: [number, number, number];
    let attempts = 0;
    do {
      pos = seededPos();
      attempts++;
    } while (!farEnough(pos, positions) && attempts < 100);

    positions.push(pos);
    weapons.push({
      id: `weapon-${i}`,
      type: pool[i],
      position: pos,
      phase: random() * Math.PI * 2,
      pickedUpBy: null,
    });
  }
  return weapons;
}

// ─────────────────────────────────────────────
// LOD + Proximity System (reads shared world state, no local alive tracking)
// ─────────────────────────────────────────────
function ProximityAndLODSystem({
  weapons,
  lightRef,
  htmlGroupRef,
  setActivePromptId,
  onPickup,
}: {
  weapons: WorldWeapon[];
  lightRef: React.RefObject<THREE.PointLight | null>;
  htmlGroupRef: React.RefObject<THREE.Group | null>;
  setActivePromptId: (id: string | null) => void;
  onPickup: (id: string) => void;
}) {
  const player = myPlayer();
  const nearbyIdRef = useRef<string | null>(null);
  const weaponRefs = useRef<Record<string, THREE.Group>>({});

  // Only ground weapons (not picked up by anyone)
  const groundWeapons = useMemo(
    () => weapons.filter((w) => w.pickedUpBy === null),
    [weapons],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e") return;
      const nid = nearbyIdRef.current;
      if (!nid || !player) return;
      const w = groundWeapons.find((x) => x.id === nid);
      if (!w) return;
      onPickup(nid);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [groundWeapons, player, onPickup]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    const playerPosition = player?.getState("position");
    const hasPlayer = Array.isArray(playerPosition);
    const px = hasPlayer ? playerPosition[0] : 0;
    const pz = hasPlayer ? playerPosition[2] : 0;

    let closestDistSq = Infinity;
    let closestWeapon: WorldWeapon | null = null;

    for (let i = 0; i < groundWeapons.length; i++) {
      const w = groundWeapons[i];
      const meshGroup = weaponRefs.current[w.id];
      if (!meshGroup) continue;

      // Animate float + rotate
      const floatingElement = meshGroup.children[0];
      if (floatingElement) {
        floatingElement.position.y =
          Math.sin(t * FLOAT_SPEED + w.phase) * FLOAT_AMPLITUDE;
        floatingElement.rotation.y = t * 0.4;
      }

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

    // Hide all weapons that are picked up (shared state already hides via conditional render,
    // but also scrub the ref just in case it lingers from a stale render cycle)
    for (const id in weaponRefs.current) {
      const isGround = groundWeapons.some((w) => w.id === id);
      if (!isGround) {
        const g = weaponRefs.current[id];
        if (g) g.visible = false;
      }
    }

    const closestDist = Math.sqrt(closestDistSq);

    // Point light follows closest weapon
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
    } else if (light) {
      light.intensity = 0;
    }

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
      {/* Only render meshes for ground weapons */}
      {groundWeapons.map((w) => (
        <group
          key={w.id}
          position={w.position}
          ref={(el) => {
            if (el) weaponRefs.current[w.id] = el;
            else delete weaponRefs.current[w.id];
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
// Master Container
// ─────────────────────────────────────────────
interface WeaponSpawnerProps {
  active: boolean;
}

export default function WeaponSpawner({ active }: WeaponSpawnerProps) {
  // ── Shared room state — single source of truth for ALL clients ──
  const [worldWeapons, setWorldWeapons] = useMultiplayerState<WorldWeapon[]>(
    "worldWeapons",
    [],
  );

  const [activePromptId, setActivePromptId] = useState<string | null>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const htmlGroupRef = useRef<THREE.Group>(null);
  const initializedRef = useRef(false);
  const player = myPlayer();

  // ── Host initializes the shared weapon layout once ──
  useEffect(() => {
    if (!active) return;
    if (initializedRef.current) return;
    if (!isHost()) return;
    if (worldWeapons.length > 0) return; // already initialized by a previous host

    initializedRef.current = true;
    setWorldWeapons(generateWorldWeapons());
  }, [active, worldWeapons.length, setWorldWeapons]);

  // ── Pickup handler — atomic swap via shared state ──
  const handlePickup = useCallback(
    (worldWeaponId: string) => {
      if (!player) return;

      const target = worldWeapons.find((w) => w.id === worldWeaponId);
      if (!target || target.pickedUpBy !== null) return; // already taken (race guard)

      const currentWeapon = player.getState("weapon") as WeaponType | null;
      const playerPosition = player.getState("position") as
        | [number, number, number]
        | null;

      // Mark picked-up weapon as held by this player
      let next: WorldWeapon[] = worldWeapons.map((w) =>
        w.id === worldWeaponId ? { ...w, pickedUpBy: player.id } : w,
      );

      // If player already has a weapon, drop it back into the world at their feet
      if (currentWeapon && playerPosition) {
        const dropPos: [number, number, number] = [
          playerPosition[0],
          getTerrainHeight(playerPosition[0], playerPosition[2]) + 2,
          playerPosition[2],
        ];
        const droppedWeapon: WorldWeapon = {
          id: `dropped-${player.id}-${Date.now()}`,
          type: currentWeapon,
          position: dropPos,
          phase: Math.random() * Math.PI * 2,
          pickedUpBy: null,
        };
        next = [...next, droppedWeapon];
      }

      // Broadcast new world state to all clients (reliable = true so it doesn't drop)
      setWorldWeapons(next, true);
      // Equip the new weapon on this player's state
      player.setState("weapon", target.type);

      setActivePromptId((prev) => (prev === worldWeaponId ? null : prev));
    },
    [player, worldWeapons, setWorldWeapons],
  );

  // Ground weapons = all weapons not currently held by anyone
  const groundWeapons = useMemo(
    () => worldWeapons.filter((w) => w.pickedUpBy === null),
    [worldWeapons],
  );

  const activeWeaponData = useMemo(() => {
    if (!activePromptId) return null;
    return groundWeapons.find((w) => w.id === activePromptId) || null;
  }, [activePromptId, groundWeapons]);

  if (!active) return null;

  return (
    <>
      <pointLight ref={lightRef} distance={10} intensity={0} />

      {/* Physics colliders only for ground weapons */}
      <RigidBody type="fixed" colliders={false}>
        {groundWeapons.map((w) => (
          <CuboidCollider
            key={`col-${w.id}`}
            position={w.position}
            args={[1, 1, 1]}
          />
        ))}
      </RigidBody>

      {/* LOD + proximity system reads live shared state */}
      <ProximityAndLODSystem
        weapons={worldWeapons}
        lightRef={lightRef}
        htmlGroupRef={htmlGroupRef}
        setActivePromptId={setActivePromptId}
        onPickup={handlePickup}
      />

      {/* Pickup prompt HUD */}
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
