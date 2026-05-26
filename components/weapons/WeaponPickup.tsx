"use client";

import Guns from "@/components/models/Guns";
import { WeaponType } from "@/lib/weapons";
import { Float, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { motion } from "framer-motion";
import { myPlayer } from "playroomkit";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  id: string;

  type: WeaponType;

  position: [number, number, number];

  onPickup: (id: string) => void;
};

const _playerPos = new THREE.Vector3();
const _pickupPos = new THREE.Vector3();

export default function WeaponPickup({ id, type, position, onPickup }: Props) {
  const ref = useRef<THREE.Group>(null);

  const player = myPlayer();

  const [nearby, setNearby] = useState(false);

  // PICKUP LOGIC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && nearby && player) {
        // EQUIP WEAPON
        player.setState("weapon", type);

        // REMOVE FROM WORLD
        onPickup(id);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [nearby, player, type, id, onPickup]);

  // DISTANCE CHECK
  useFrame(() => {
    if (!ref.current || !player) return;

    const playerPosition = player.getState("position");

    if (!playerPosition) return;

    _playerPos.set(playerPosition[0], playerPosition[1], playerPosition[2]);

    ref.current.getWorldPosition(_pickupPos);

    const distance = _playerPos.distanceTo(_pickupPos);

    setNearby(distance < 4);
  });

  // GLOW COLORS
  const glowColor =
    type === "smg" ? "#00d2ff" : type === "ak47" ? "#ff9500" : "#ff4fd8";

  return (
    <group ref={ref} position={position}>
      {/* COLLIDER */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1, 1, 1]} />
      </RigidBody>

      <group
        scale={type === "pistol" ? 0.4 : type === "smg" ? 0.8 : 1}
        position={type === "pistol" ? [0, -1, 0] : [0, 0, 0]}
      >
        <Float speed={1} rotationIntensity={0.6} floatIntensity={1.2}>
          {/* GLOW ORB */}
          <mesh scale={2}>
            <sphereGeometry args={[1, 24, 24]} />

            <meshBasicMaterial color={glowColor} transparent opacity={0.25} />
          </mesh>

          {/* LIGHT */}
          <pointLight intensity={12} distance={8} color={glowColor} />

          {/* WEAPON */}
          <Guns
            position={
              type === "pistol"
                ? [-1, -1.7, 5.2]
                : type === "smg"
                  ? [-1, -2.5, 0]
                  : [0, 0, 0]
            }
            type={type}
            scale={type === "pistol" ? 0.8 : type === "ak47" ? 0.9 : 1}
            rotation={[0, Math.PI / 2, 0]}
          />
        </Float>
      </group>

      {/* INTERACTION UI */}
      {nearby && (
        <Html center position={[0, 2.2, 0]}>
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 10,
            }}
            transition={{
              duration: 0.2,
            }}
            className="
              select-none
              whitespace-nowrap
              rounded-2xl
              border
              border-white/10
              bg-black/70
              px-4
              py-2
              text-xs
              text-white
              backdrop-blur-xl
              shadow-[0_4px_20px_#00000060]
            "
          >
            Press <span className="font-bold text-green-400">E</span> to equip{" "}
            <span className="font-semibold uppercase">{type}</span>
          </motion.div>
        </Html>
      )}
    </group>
  );
}
