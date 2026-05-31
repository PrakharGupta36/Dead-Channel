"use client";

import Guns, { GunType } from "@/components/models/Guns";
import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useRef } from "react";
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
}

type Props = {
  weapon: GunType;
  isLocal?: boolean;
  aimPitch?: React.MutableRefObject<number>;
  isAiming?: React.MutableRefObject<boolean>;
};

// ─── Weapon Static Transformations Configuration Map ──────────────────────────
// Paste your exact positional and rotational offsets determined via Leva below.
// The default rotation [0, -4.3, 0] is configured as the baseline below.
const WEAPON_TRANSFORMS: Record<
  GunType,
  { pos: [number, number, number]; rot: [number, number, number] }
> = {
  pistol: {
    pos: [0.2, 0, 0], // Insert your custom rifle position values here
    rot: [-0.1, -5.3, -0.0],
  },
  smg: {
    pos: [0.2, 0, 0], // Insert your custom rifle position values here
    rot: [-0.1, -5.3, -0.0], // Insert your custom rifle rotation values here
  },
  ak47: {
    pos: [0, 0, 0], // Insert your custom shotgun position values here
    rot: [0, -4.3, 0], // Insert your custom shotgun rotation values here
  },
};

const EquippedWeapon = forwardRef<EquippedWeaponHandle, Props>(
  ({ weapon, isLocal = true, aimPitch, isAiming }, ref) => {
    const armPivotRef = useRef<THREE.Group>(null);
    const gunGroupRef = useRef<THREE.Group>(null);
    const muzzleRef = useRef<THREE.Object3D>(null);

    useImperativeHandle(ref, () => ({
      getMuzzleWorldPosition: (out: THREE.Vector3) => {
        if (muzzleRef.current) {
          muzzleRef.current.getWorldPosition(out);
        }
      },
    }));

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

    // Pull calculations seamlessly per unique gun type selection
    const currentTransform = {
      pos: [0.2, 0, 0] as [number, number, number],
      rot: [-0.1, -5.3, -0.0] as [number, number, number],
    };

    return (
      <group
        ref={armPivotRef}
        position={[0.55, 0.6, 0.1]}
        rotation={[0, 2, 0]}
        scale={1.2}
      >
        <group ref={gunGroupRef} position={HIP_POS.toArray()}>
          {/* Static transformations completely separated from runtime listeners */}
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
