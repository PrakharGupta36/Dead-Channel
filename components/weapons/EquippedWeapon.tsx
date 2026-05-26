"use client";

import Guns, { GunType } from "@/components/models/Guns";

type Props = {
  weapon: GunType;

  isLocal?: boolean;
};

export default function EquippedWeapon({ weapon }: Props) {
  return (
    <group
      position={[-2, 0.6, -0.7]}
      rotation={[0, -Math.PI / 2, 0]}
      scale={0.28}
    >
      <group>
        <Guns type={weapon} />
      </group>
    </group>
  );
}
