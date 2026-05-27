"use client";

import EquippedWeapon from "@/components/weapons/EquippedWeapon";
import { Html } from "@react-three/drei";
import { forwardRef } from "react";
import * as THREE from "three";

interface PlayerBodyProps {
  color: string;
  playerId: string; // Changed from 'name' to 'playerId'
  health: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weapon: any;
  isLocal?: boolean;
  label?: string;
}

const PlayerBody = forwardRef<THREE.Group, PlayerBodyProps>(
  ({ color, playerId, health, weapon, isLocal = false, label }, ref) => {
    const clampedHealth = Math.max(0, Math.min(100, health));

    return (
      <group ref={ref} position={[0, -0.5, 0]}>
        {/* Capsule body */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* PERFORMANCE FIX: Continuously mount the component. 
            Toggle 3D object visibility instead of creating/destroying nodes. */}
        <group visible={!!weapon}>
          <EquippedWeapon weapon={weapon || "pistol"} isLocal={isLocal} />
        </group>

        {/* Overhead nameplate + health bar */}
        <Html position={[0, 2.2, 0]} center distanceFactor={10} occlude >
          <div className="pointer-events-none relative top-8 select-none">
            {/* Displaying playerId here instead of profile name */}
            <div
              className="mb-1 text-center text-xs font-mono font-bold drop-shadow break-all max-w-[120px]"
              style={{ color }}
            >
              {playerId}
              {label && (
                <span className="font-normal opacity-60"> {label}</span>
              )}
            </div>

            <div className="h-3 w-24 overflow-hidden rounded-full border border-black/40 bg-black/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-300 transition-[width] duration-150"
                style={{ width: `${clampedHealth}%` }}
              />
            </div>
          </div>
        </Html>
      </group>
    );
  },
);

PlayerBody.displayName = "PlayerBody";
export default PlayerBody;