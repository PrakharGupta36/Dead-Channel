"use client";

import EquippedWeapon, {
  EquippedWeaponHandle,
} from "@/components/weapons/Equipped-Weapon";
import { useFiring } from "@/hooks/useFiring";
import { GunType } from "@/store/useGameStore";
import { Html, PositionalAudio } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useRef, useState } from "react";
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
  // New: spawn shield from network state
  spawnShield?: boolean;
}

const _fallbackPos = new THREE.Vector3();

// ── Shield pulse material (reused across renders) ─────────────────────────────
// We drive opacity via a ref in useFrame to avoid per-frame React state updates.
const SHIELD_COLOR = new THREE.Color(0x38bdf8); // sky-400

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
      spawnShield = false,
    },
    ref,
  ) => {
    const weaponRef = useRef<EquippedWeaponHandle>(null);
    const fallbackPosRef = useRef<THREE.Vector3>(_fallbackPos);
    const audioRef = useRef<THREE.PositionalAudio>(null);
    const shieldMeshRef = useRef<THREE.Mesh>(null);
    const shieldMatRef = useRef<THREE.MeshStandardMaterial>(null);

    const clampedHealth = Math.max(0, Math.min(100, health));
    const prevHealthRef = useRef(clampedHealth);

    // ── Respawn detection ─────────────────────────────────────────────────────
    const isRespawn =
      clampedHealth > prevHealthRef.current && prevHealthRef.current === 0;

    // ── Death/respawn body visibility: fade out on death, snap in on respawn ──
    const [bodyVisible, setBodyVisible] = useState(clampedHealth > 0);
    const bodyOpacityRef = useRef(clampedHealth > 0 ? 1 : 0);
    const bodyMeshRef = useRef<THREE.Mesh>(null);
    const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);

    useEffect(() => {
      prevHealthRef.current = clampedHealth;
    }, [clampedHealth]);

    // When health reaches 0 start a fade-out; on respawn snap immediately visible
    useEffect(() => {
      if (clampedHealth <= 0) {
        // Start fade — handled in useFrame below
      } else if (isRespawn) {
        // Instant snap on respawn: no fade-in flash
        bodyOpacityRef.current = 1;
        setBodyVisible(true);
        if (bodyMatRef.current) {
          bodyMatRef.current.opacity = 1;
          bodyMatRef.current.transparent = false;
          bodyMatRef.current.needsUpdate = true;
        }
      } else {
        setBodyVisible(true);
        bodyOpacityRef.current = 1;
      }
    }, [clampedHealth, isRespawn]);

    // ── Shield pulse + body fade in useFrame (zero React state overhead) ──────
    const shieldTimeRef = useRef(0);
    useFrame((_, delta) => {
      // ── Death fade-out ──────────────────────────────────────────────────────
      if (clampedHealth <= 0 && bodyOpacityRef.current > 0) {
        bodyOpacityRef.current = Math.max(
          0,
          bodyOpacityRef.current - delta * 3,
        );
        if (bodyMatRef.current) {
          bodyMatRef.current.transparent = true;
          bodyMatRef.current.opacity = bodyOpacityRef.current;
          bodyMatRef.current.needsUpdate = true;
        }
        if (bodyOpacityRef.current <= 0) setBodyVisible(false);
      }

      // ── Shield pulse ────────────────────────────────────────────────────────
      if (!shieldMeshRef.current || !shieldMatRef.current) return;

      if (spawnShield) {
        shieldTimeRef.current += delta;
        const pulse = 0.25 + 0.15 * Math.sin(shieldTimeRef.current * 6);
        shieldMatRef.current.opacity = pulse;
        shieldMeshRef.current.visible = true;

        // Slow spin
        shieldMeshRef.current.rotation.y += delta * 1.2;
        shieldMeshRef.current.rotation.x += delta * 0.4;
      } else {
        shieldTimeRef.current = 0;
        shieldMeshRef.current.visible = false;
        shieldMatRef.current.opacity = 0;
      }
    });

    useFiring({
      weapon: isLocal ? weapon : null,
      playerId,
      playerPositionRef: playerPositionRef ?? fallbackPosRef,
      otherPlayerMeshes: otherPlayerMeshes ?? { current: {} },
      enabled: isLocal && !!weapon,
    });

    // ── Audio: walking sound ──────────────────────────────────────────────────
    useEffect(() => {
      const sound = audioRef.current;
      if (!sound) return;
      if (!sound.buffer) return;

      if (isMoving) {
        if (!sound.isPlaying) sound.play();
      } else {
        if (sound.isPlaying) sound.pause();
      }
    }, [isMoving]);

    useEffect(() => {
      return () => {
        if (audioRef.current?.isPlaying) audioRef.current.stop();
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

        {/* ── Player capsule body ──────────────────────────────────────────── */}
        <mesh
          ref={bodyMeshRef}
          castShadow
          position={[0, 0.5, 0]}
          userData={{ playerId }}
          visible={bodyVisible}
        >
          <capsuleGeometry args={[0.5, 1]} />
          <meshStandardMaterial
            ref={bodyMatRef}
            color={color}
            roughness={0.4}
            metalness={0.1}
            transparent={false}
            opacity={1}
          />
        </mesh>

        {/* ── Spawn-shield dome ────────────────────────────────────────────── */}
        {/*
          Slightly larger than the capsule, icosahedron for a crystalline look.
          Rendered only when spawnShield is ever true for this player.
          Visibility is toggled in useFrame to avoid React re-renders.
        */}
        <mesh ref={shieldMeshRef} position={[0, 0.5, 0]} visible={spawnShield}>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshStandardMaterial
            ref={shieldMatRef}
            color={SHIELD_COLOR}
            transparent
            opacity={0.3}
            emissive={SHIELD_COLOR}
            emissiveIntensity={0.6}
            wireframe={false}
            depthWrite={false}
            side={THREE.FrontSide}
          />
        </mesh>

        {/* ── Weapon ──────────────────────────────────────────────────────── */}
        <group visible={!!weapon}>
          <EquippedWeapon
            ref={weaponRef}
            weapon={weapon ?? "pistol"}
            isLocal={isLocal}
            aimPitch={aimPitch}
            isAiming={isAiming}
          />
        </group>

        {/* ── Player HUD: name + health bar ───────────────────────────────── */}
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
                  {/* Shield badge */}
                  {spawnShield && (
                    <span
                      className="font-mono font-bold uppercase tracking-wider"
                      style={{
                        fontSize: "0.4rem",
                        color: "#38bdf8",
                        textShadow: "0 0 6px #38bdf880",
                        animation: "pulse 1s ease-in-out infinite",
                      }}
                    >
                      ⬡ SHIELD
                    </span>
                  )}
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
