"use client";

import Guns, { GunType } from "@/components/models/Guns";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
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

const EquippedWeapon = forwardRef<EquippedWeaponHandle, Props>(
  ({ weapon, isLocal = true, aimPitch, isAiming }, ref) => {
    const armPivotRef = useRef<THREE.Group>(null);
    const gunGroupRef = useRef<THREE.Group>(null);
    const tweakGroupRef = useRef<THREE.Group>(null);
    const muzzleRef = useRef<THREE.Object3D>(null);

    // Explicitly enforce fixed tuple types so Three.js methods accept them smoothly
    const liveTweak = useRef<{
      pos: [number, number, number];
      rot: [number, number, number];
    }>({
      pos: [0, 0, 0],
      rot: [0, -Math.PI / 2, 0],
    });

    // Safe inline SSR check: evaluates synchronously on render without setting state
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    const folderName = `Weapons Offset System`;
    useControls(
      folderName,
      {
        [`${weapon} Position`]: {
          value: [0, 0, 0],
          step: 0.005,
          onChange: (v) => {
            liveTweak.current.pos = [v[0], v[1], v[2]];
          },
        },
        [`${weapon} Rotation`]: {
          value: [0, -Math.PI / 2, 0],
          step: 0.01,
          onChange: (v) => {
            liveTweak.current.rot = [v[0], v[1], v[2]];
          },
        },
      },
      { render: () => isLocal && isLocalhost },
    );

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
      const tweak = tweakGroupRef.current;
      if (!arm || !gun || !tweak) return;

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

      tweak.position.fromArray(liveTweak.current.pos);
      tweak.rotation.fromArray(liveTweak.current.rot);
    });

    const scale = weapon === "pistol" ? 0.22 : 0.26;
    const muzzleOffset = weapon === "pistol" ? -1.2 : -1.8;

    return (
      <group
        ref={armPivotRef}
        position={[.55, 0.6, 0.1]}
        rotation={[0, 2, 0]}
        scale={1.2}
      >
        <group ref={gunGroupRef} position={HIP_POS.toArray()}>
          <group
            ref={tweakGroupRef}
            rotation={[0, -4.3, 0]}
            
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
