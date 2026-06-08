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
  displayName: string;
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
      displayName,
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

    // ── 🛠️ AUDIO HOOK REPAIR: Safety guards added to prevent audio crashes during instant component mounts ──
    useEffect(() => {
      const sound = audioRef.current;
      if (!sound) return;

      // Wrap in a safe checker loop to handle unmount/remount delays
      const handleAudioState = () => {
        // Stop execution if the ThreeJS source buffer has not resolved yet
        if (!sound.buffer) return;

        if (isMoving) {
          if (!sound.isPlaying) {
            sound.play();
          }
        } else {
          if (sound.isPlaying) {
            sound.pause();
          }
        }
      };

      handleAudioState();
    }, [isMoving]);

    // Safety fallback: ensure audio stops if this specific instance unmounts during death
    useEffect(() => {
      return () => {
        if (audioRef.current && audioRef.current.isPlaying) {
          audioRef.current.stop();
        }
      };
    }, []);

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
        <PositionalAudio
          ref={audioRef}
          url="/sounds/player/Walking.mp3"
          distance={5}
          setVolume={0.5}
          loop
          autoplay={false}
        />

        <mesh castShadow position={[0, 0.5, 0]} userData={{ playerId }}>
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>

        <group visible={!!weapon}>
          <EquippedWeapon
            ref={weaponRef}
            weapon={weapon ?? "pistol"}
            isLocal={isLocal}
            aimPitch={aimPitch}
            isAiming={isAiming}
          />
        </group>

        <Html position={[0, 2.5, 0]} center distanceFactor={10} occlude>
          <div className="pointer-events-none relative top-8 select-none">
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
                    className="font-mono font-semibold uppercase tracking-[0.18em] text-white/88"
                    style={{ fontSize: ".5rem" }}
                  >
                    {displayName}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="relative h-2 w-40 overflow-hidden rounded-full border border-white/[0.05] bg-gradient-to-b from-[#151515] to-[#0a0a0a] p-[2px] shadow-[0_1px_0_#ffffff15,0_2px_8px_#000000aa_inset]"
              style={{ marginTop: "8px" }}
            >
              <div className="absolute inset-[2px] rounded-full bg-[#050505]" />
              <div
                className="relative h-full rounded-full"
                style={{
                  width: `${clampedHealth}%`,
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
