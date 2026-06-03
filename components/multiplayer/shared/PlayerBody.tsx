"use client";

import EquippedWeapon, {
  EquippedWeaponHandle,
} from "@/components/weapons/Equipped-Weapon";
import { useFiring } from "@/hooks/useFiring";
import { GunType } from "@/store/useGameStore";
import { Html, PositionalAudio } from "@react-three/drei";
import { forwardRef, useEffect, useRef } from "react";
import * as THREE from "three";

interface PlayerBodyProps {
  color: string;
  playerId: string;
  health: number;
  weapon: GunType | null;
  isLocal?: boolean;
  aimPitch?: React.RefObject<number>;
  isAiming?: React.RefObject<boolean>;

  otherPlayerMeshes?: React.RefObject<Record<string, THREE.Object3D>>;

  playerPositionRef?: React.RefObject<THREE.Vector3>;

  isMoving?: boolean;
}

const _fallbackPos = new THREE.Vector3();

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
      otherPlayerMeshes,
      playerPositionRef,
      isMoving = false,
    },
    ref,
  ) => {
    const weaponRef = useRef<EquippedWeaponHandle>(null);
    const fallbackPosRef = useRef<THREE.Vector3>(_fallbackPos);
    const audioRef = useRef<THREE.PositionalAudio>(null);

    const clampedHealth = Math.max(0, Math.min(100, health));
    const prevHealthRef = useRef(clampedHealth);

    // Detect if the player just respawned so we can snap the health bar back to full instantly
    const isRespawn =
      clampedHealth > prevHealthRef.current && prevHealthRef.current === 0;

    useEffect(() => {
      prevHealthRef.current = clampedHealth;
    }, [clampedHealth]);

    useFiring({
      weapon: isLocal ? weapon : null,
      playerId,
      playerPositionRef: playerPositionRef ?? fallbackPosRef,
      otherPlayerMeshes: otherPlayerMeshes ?? { current: {} },
      enabled: isLocal && !!weapon,
    });

    useEffect(() => {
      if (!audioRef.current) return;

      if (isMoving) {
        if (!audioRef.current.isPlaying) {
          audioRef.current.play();
        }
      } else {
        if (audioRef.current.isPlaying) {
          audioRef.current.pause();
        }
      }
    }, [isMoving]);

    useEffect(() => {
      if (weaponRef.current && weapon) {
        weaponRef.current.playEquipSound();
      }
    }, [weapon]);

    return (
      <group
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref)
            (ref as React.MutableRefObject<THREE.Group | null>).current = node;
        }}
        position={[0, -0.5, 0]}
        userData={{ playerId }}
      >
        {/* 3D Spatial Audio Footsteps */}
        <PositionalAudio
          ref={audioRef}
          url="/sounds/player/Walking.mp3"
          distance={5}
          setVolume={0.5}
          loop
          autoplay={false}
        />

        {/* Capsule body — tagged so raycast can walk up hierarchy */}
        <mesh castShadow position={[0, 0.5, 0]} userData={{ playerId }}>
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Weapon */}
        <group visible={!!weapon}>
          <EquippedWeapon
            ref={weaponRef}
            weapon={weapon ?? "pistol"}
            isLocal={isLocal}
            aimPitch={aimPitch}
            isAiming={isAiming}
          />
        </group>

        {/* Overhead nameplate + health bar */}
        <Html position={[0, 2.5, 0]} center distanceFactor={10} occlude>
          <div className="pointer-events-none relative top-8 select-none">
            {/* NAME PLATE */}
            <div className="mb-2 flex justify-center">
              <div className="relative overflow-hidden">
                <div className="relative flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 10px ${color}33`,
                    }}
                  />
                  <span
                    className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-white/88"
                    style={{ fontSize: ".5rem" }}
                  >
                    {playerId}
                  </span>
                </div>
              </div>
            </div>

            {/* HEALTH BAR */}
            <div
              className="relative h-2 w-40 overflow-hidden rounded-full border border-white/[0.05] bg-gradient-to-b from-[#151515] to-[#0a0a0a] p-[2px] shadow-[0_1px_0_#ffffff15,0_2px_8px_#000000aa_inset]"
              style={{ marginTop: "8px" }}
            >
              <div className="absolute inset-[2px] rounded-full bg-[#050505]" />
              <div
                className="relative h-full rounded-full"
                style={{
                  width: `${clampedHealth}%`,
                  // Use an inline transition override so respawns snap instantly, but hits animate smoothly
                  transition: isRespawn
                    ? "none"
                    : "width 300ms ease-out, background-color 300ms linear",
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
                <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
                <div className="absolute inset-0 opacity-40 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]" />
                {clampedHealth <= 20 && (
                  <div className="absolute inset-0 animate-pulse bg-red-500/20" />
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
