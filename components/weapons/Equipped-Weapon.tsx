"use client";

import Guns, { GunType } from "@/components/models/Guns";
import { PositionalAudio } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

const HIP_POS = new THREE.Vector3(-0.52, 0.55, -0.25);
const ADS_POS = new THREE.Vector3(-0.52, 0.55, -0.25);

const PITCH_TILT_SCALE = -0.75;
const LERP_SPEED = 14;

const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

export interface EquippedWeaponHandle {
  /** World-space position of the muzzle tip */
  getMuzzleWorldPosition: (out: THREE.Vector3) => void;
  /** Force play the equip sound even if switching to the same weapon */
  playEquipSound: () => void;
}

type Props = {
  weapon: GunType;
  isLocal?: boolean;
  aimPitch?: React.RefObject<number>;
  isAiming?: React.RefObject<boolean>;
};

// ─── Weapon Static Transformations Configuration Map ──────────────────────────
const WEAPON_TRANSFORMS: Record<
  GunType,
  { pos: [number, number, number]; rot: [number, number, number] }
> = {
  pistol: {
    pos: [0.2, 0, 0],
    rot: [-0.1, -5.3, -0.0],
  },
  smg: {
    pos: [0.2, 0, 0],
    rot: [-0.1, -5.3, -0.0],
  },
  ak47: {
    pos: [0.2, 0, 0],
    rot: [-0.1, -5.3, -0.0],
  },
};

const EquippedWeapon = forwardRef<EquippedWeaponHandle, Props>(
  ({ weapon, isLocal = true, aimPitch, isAiming }, ref) => {
    const armPivotRef = useRef<THREE.Group>(null);
    const gunGroupRef = useRef<THREE.Group>(null);
    const muzzleRef = useRef<THREE.Object3D>(null);
    const audioRef = useRef<THREE.PositionalAudio>(null);

    // Helper to fire the audio immediately
    const triggerAudioPlayback = () => {
      if (!audioRef.current) return;
      if (audioRef.current.isPlaying) {
        audioRef.current.stop();
      }
      audioRef.current.play();
    };

    useImperativeHandle(ref, () => ({
      getMuzzleWorldPosition: (out: THREE.Vector3) => {
        if (muzzleRef.current) {
          muzzleRef.current.getWorldPosition(out);
        }
      },
      playEquipSound: () => {
        triggerAudioPlayback();
      },
    }));

    // Trigger on weapon string value mutations
    useEffect(() => {
      if (weapon) {
        triggerAudioPlayback();
      }
    }, [weapon]);

    useFrame((_, delta) => {
      const arm = armPivotRef.current;
      const gun = gunGroupRef.current;
      if (!arm || !gun) return;

      const aiming = isAiming?.current ?? false;
      const pitch = aimPitch?.current ?? 0;
      const lerpT = 1 - Math.exp(-LERP_SPEED * delta);

      const targetPitchX = pitch * PITCH_TILT_SCALE + (aiming ? -0.08 : 0);
      arm.rotation.x = THREE.MathUtils.lerp(
        arm.rotation.x,
        targetPitchX,
        lerpT,
      );

      _targetPos.copy(aiming ? ADS_POS : HIP_POS);
      gun.position.lerp(_targetPos, lerpT);

      _euler.set(-arm.rotation.x * 0.6, 0, 0);
      _targetQuat.setFromEuler(_euler);
      gun.quaternion.slerp(_targetQuat, lerpT);
    });

    const scale = weapon === "pistol" ? 0.22 : 0.26;
    const muzzleOffset = weapon === "pistol" ? -1.2 : -1.8;

    const currentTransform =
      WEAPON_TRANSFORMS[weapon] ?? WEAPON_TRANSFORMS.pistol;

    return (
      <group
        ref={armPivotRef}
        position={[0.55, 0.6, 0.1]}
        rotation={[0, 2, 0]}
        scale={1.2}
      >
        {/* Spatial Weapon Equip Audio */}
        <PositionalAudio
          ref={audioRef}
          url="/sounds/weapons/Equip.mp3"
          distance={7}
          loop={false}
          autoplay={false}
        />

        <group ref={gunGroupRef} position={HIP_POS.toArray()}>
          <group
            position={currentTransform.pos}
            rotation={currentTransform.rot}
          >
            <Guns type={weapon} scale={scale} />
            <object3D
              ref={muzzleRef}
              position={[0, 0, muzzleOffset]}
              userData={{ isBullet: true }}
            />
          </group>
        </group>
      </group>
    );
  },
);

EquippedWeapon.displayName = "EquippedWeapon";
export default EquippedWeapon;
