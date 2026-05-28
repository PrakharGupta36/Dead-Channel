"use client";

import EquippedWeapon from "@/components/weapons/EquippedWeapon";
import { Html } from "@react-three/drei";
import { forwardRef } from "react";
import * as THREE from "three";

interface PlayerBodyProps {
  color: string;
  playerId: string;
  health: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weapon: any;
  isLocal?: boolean;
  label?: string;
  /** Local-only: live pitch ref so the weapon arm tilts with vertical aim */
  aimPitch?: React.RefObject<number>;
  /** Local-only: whether RMB is held (ADS) */
  isAiming?: React.RefObject<boolean>;
}

const PlayerBody = forwardRef<THREE.Group, PlayerBodyProps>(
  (
    {
      color,
      playerId,
      health,
      weapon,
      isLocal = false,
      label,
      aimPitch,
      isAiming,
    },
    ref,
  ) => {
    const clampedHealth = Math.max(0, Math.min(100, health));

    return (
      <group ref={ref} position={[0, -0.5, 0]}>
        {/* Capsule body */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Weapon — always mounted, visibility toggled for perf */}
        <group visible={!!weapon}>
          <EquippedWeapon
            weapon={weapon || "pistol"}
            isLocal={isLocal}
            aimPitch={aimPitch}
            isAiming={isAiming}
          />
        </group>

        {/* Overhead nameplate + health bar */}
        <Html position={[0, 2.2, 0]} center distanceFactor={10} occlude>
          <div className="pointer-events-none relative top-8 select-none">
            <div
              className="mb-1 text-center text-xs font-mono font-bold drop-shadow break-all max-w-[20px] "
              style={{ color, }}
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
