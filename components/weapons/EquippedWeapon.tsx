"use client";

import Guns, { GunType } from "@/components/models/Guns";

type Props = {
  weapon: GunType;

  isLocal?: boolean;
};

export default function EquippedWeapon({ weapon, isLocal = false }: Props) {
  return (
    <group position={[-2, .6, -.7]} rotation={[0, -Math.PI / 2, 0]} scale={0.28}>
      {/* LOCAL PLAYER GUN */}
      {isLocal ? (
        <group position={[0.2, 0, 0.15]} rotation={[0, 0.08, 0]}>
          <Guns type={weapon} />
        </group>
      ) : (
        // REMOTE PLAYER GUN
        <group>
          <Guns type={weapon} />
        </group>
      )}
    </group>
  );
}
