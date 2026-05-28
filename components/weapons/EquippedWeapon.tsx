"use client";

import Guns, { GunType } from "@/components/models/Guns";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// ── Hip-fire offset in body-local space ─────────────────────────────────────
// Body group origin is at [0, -0.5, 0] relative to RigidBody.
// Capsule mesh sits at [0, 0.5, 0] so body centre ≈ y=0.5 in this space.
// Right hand = positive X, chest height = y≈0.6, slightly forward = positive Z.
const HIP_POS = new THREE.Vector3(-0.52, 0.55, -0.25);
// const HIP_ROT_X = 0; // no tilt when looking straight ahead

// ── ADS offset — raise slightly and centre ──────────────────────────────────
const ADS_POS = new THREE.Vector3(-0.52, 0.55, -0.25);

const PITCH_TILT_SCALE = -0.75; // how much barrel tilts up per radian of camera pitch
const LERP_SPEED = 14;

const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

type Props = {
  weapon: GunType;
  isLocal?: boolean;
  aimPitch?: React.MutableRefObject<number>;
  isAiming?: React.MutableRefObject<boolean>;
};

export default function EquippedWeapon({
  weapon,
  // isLocal = false,
  aimPitch,
  isAiming,
}: Props) {
  // armPivot rotates on X axis (pitch) — inherits parent body Y (yaw) automatically
  const armPivotRef = useRef<THREE.Group>(null);
  // gunGroup translates in armPivot local space
  const gunGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const arm = armPivotRef.current;
    const gun = gunGroupRef.current;
    if (!arm || !gun) return;

    const aiming = isAiming?.current ?? false;
    const pitch = aimPitch?.current ?? 0;

    const lerpT = 1 - Math.exp(-LERP_SPEED * delta);

    // 1. Rotate arm pivot on X so barrel tracks vertical aim
    const targetPitchX = pitch * PITCH_TILT_SCALE + (aiming ? -0.08 : 0);
    arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, targetPitchX, lerpT);

    // 2. Slide gun between hip and ADS positions in arm-local space
    _targetPos.copy(aiming ? ADS_POS : HIP_POS);
    gun.position.lerp(_targetPos, lerpT);

    // 3. Keep gun barrel always pointing forward (−Z is forward in body space
    //    but we compensate for the arm pivot's X rotation so barrel stays level)
    _euler.set(-arm.rotation.x * 0.6, 0, 0); // counter-rotate slightly for natural look
    _targetQuat.setFromEuler(_euler);
    gun.quaternion.slerp(_targetQuat, lerpT);
  });

  const scale = weapon === "pistol" ? 0.22 : 0.26;

  return (
    // armPivot: anchored at shoulder height, rotates on X for pitch
    <group ref={armPivotRef} position={[-0.2, 0.6, 0]} rotation={[0,2,0]} scale={1.1}>
      {/* gunGroup: slides between hip/ADS, barrel always forward */}
      <group ref={gunGroupRef} position={HIP_POS.toArray()}>
        {/* Guns model faces +Z by default; rotate so barrel points away from player */}
        <group rotation={[0, -Math.PI / 2, 0]}>
          <Guns type={weapon} scale={scale} />
        </group>
      </group>
    </group>
  );
}
