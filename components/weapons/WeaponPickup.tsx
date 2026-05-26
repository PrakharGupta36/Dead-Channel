"use client";

import Guns from "@/components/models/Guns";
import { WeaponType } from "@/lib/weapons";
import { Float, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { myPlayer } from "playroomkit";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  id: string;
  type: WeaponType;
  position: [number, number, number];
  onPickup: (id: string) => void;
};

const _playerPos = new THREE.Vector3();
const _pickupPos = new THREE.Vector3();

const PICKUP_DISTANCE = 4;

const GLOW_COLORS: Record<WeaponType, string> = {
  smg: "#00d2ff",
  ak47: "#ff9500",
  pistol: "#ff4fd8",
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

export default function WeaponPickup({ id, type, position, onPickup }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const player = myPlayer();
  // Track nearby state without causing React re-renders
  const isNearby = useRef(false);

  // Keydown listener — reads isNearby ref, no state dependency
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e") return;
      if (!isNearby.current || !player) return;
      player.setState("weapon", type);
      onPickup(id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, type, id, onPickup]);

  // Distance check — mutates DOM directly, zero React re-renders
  useFrame(() => {
    if (!groupRef.current || !player) return;

    const playerPosition = player.getState("position");
    if (!Array.isArray(playerPosition)) return;

    _playerPos.set(playerPosition[0], playerPosition[1], playerPosition[2]);
    groupRef.current.getWorldPosition(_pickupPos);

    const close = _playerPos.distanceTo(_pickupPos) < PICKUP_DISTANCE;

    if (close !== isNearby.current) {
      isNearby.current = close;
      if (promptRef.current) {
        promptRef.current.style.opacity = close ? "1" : "0";
        promptRef.current.style.transform = close
          ? "translateY(0)"
          : "translateY(10px)";
      }
    }
  });

  const glowColor = GLOW_COLORS[type];

  return (
    <group ref={groupRef} position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1, 1, 1]} />
      </RigidBody>

      <group scale={GUN_SCALES[type]} position={GUN_OFFSETS[type]}>
        <Float speed={3} rotationIntensity={0.6} floatIntensity={1.8}>
          {/* Glow orb */}
          <mesh scale={2}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.25} />
          </mesh>

          <pointLight intensity={12} distance={8} color={glowColor} />

          <Guns
            position={GUN_INNER_POSITIONS[type]}
            type={type}
            scale={GUN_INNER_SCALES[type]}
            rotation={[0, Math.PI / 2, 0]}
          />
        </Float>
      </group>

      {/* Prompt rendered once, shown/hidden via imperative DOM — no re-mount */}
      <Html center occlude position={[0, 2.2, 0]}>
        <div
          ref={promptRef}
          style={{
            opacity: 0,
            transform: "translateY(10px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.7)",
            padding: "6px 14px",
            fontSize: "12px",
            color: "white",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            position: "relative",
            top: "210px",
          }}
        >
          Press <span style={{ fontWeight: "bold", color: "#4ade80" }}>E</span>{" "}
          to equip{" "}
          <span style={{ fontWeight: 600, textTransform: "uppercase" }}>
            {type}
          </span>
        </div>
      </Html>
    </group>
  );
}
