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
          <div className="pointer-events-none relative top-8 select-none ">
            {/* NAME PLATE */}
            <div className="mb-2 flex justify-center">
              <div
                className="
        relative overflow-hidden 
      
      "
              >
              

                <div className="relative flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 10px ${color}33`,
                    }}
                  />

                  <span
                    className="
            font-mono text-[12px] font-semibold uppercase
            tracking-[0.18em] text-white/88
          "
                    style={{ fontSize: ".5rem" }}
                  >
                    {playerId}
                  </span>
                </div>
              </div>
            </div>

            {/* HEALTH BAR */}
            <div
              className="
    relative h-2 w-40 overflow-hidden rounded-full
    border border-white/[0.05]
    bg-gradient-to-b from-[#151515] to-[#0a0a0a]
    p-[2px]
    shadow-[0_1px_0_#ffffff15,0_2px_8px_#000000aa_inset]
  "
              style={{ marginTop: "8px" }}
            >
              {/* cavity */}
              <div className="absolute inset-[2px] rounded-full bg-[#050505]" />

              {/* health fill */}
              <div
                className="
      relative h-full rounded-full
      transition-all duration-300 ease-out
    "
                style={{
                  width: `${clampedHealth}%`,

                  // GAME-LIKE COLOR TRANSITION
                  background:
                    clampedHealth > 70
                      ? "linear-gradient(180deg,#4ade80 0%,#22c55e 50%,#166534 100%)"
                      : clampedHealth > 45
                        ? "linear-gradient(180deg,#facc15 0%,#f59e0b 50%,#b45309 100%)"
                        : clampedHealth > 20
                          ? "linear-gradient(180deg,#fb923c 0%,#ea580c 50%,#9a3412 100%)"
                          : "linear-gradient(180deg,#ef4444 0%,#b91c1c 50%,#450a0a 100%)",

                  boxShadow:
                    clampedHealth > 70
                      ? "0 0 12px rgba(34,197,94,0.35)"
                      : clampedHealth > 45
                        ? "0 0 12px rgba(245,158,11,0.35)"
                        : clampedHealth > 20
                          ? "0 0 12px rgba(234,88,12,0.35)"
                          : "0 0 14px rgba(239,68,68,0.4)",
                }}
              >
                {/* glossy top highlight */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />

                {/* animated shine */}
                <div
                  className="
        absolute inset-0 opacity-40
        bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]
      "
                />

                {/* danger pulse */}
                {clampedHealth <= 20 && (
                  <div
                    className="
          absolute inset-0
          animate-pulse
          bg-red-500/20
        "
                  />
                )}
              </div>
            </div>
          </div>
        </Html>
      </group>
    );
  },
);

PlayerBody.displayName = "PlayerBody";
export default PlayerBody;
