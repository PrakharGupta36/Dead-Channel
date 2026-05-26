"use client";

import { useState } from "react";

import { WeaponType } from "@/lib/weapons";

import WeaponPickup from "./WeaponPickup";

const MAP_LIMIT = 60;
const MIN_DISTANCE = 14;
const WEAPON_COUNT = 15;

const WEAPON_TYPES: WeaponType[] = ["smg", "ak47", "pistol"];

type SpawnedWeapon = {
  id: string;

  type: WeaponType;

  position: [number, number, number];
};

function isFarEnough(
  pos: [number, number, number],
  others: [number, number, number][],
) {
  return others.every((other) => {
    const dx = pos[0] - other[0];
    const dz = pos[2] - other[2];

    return Math.sqrt(dx * dx + dz * dz) > MIN_DISTANCE;
  });
}

export default function WeaponSpawner() {
  const [weapons, setWeapons] = useState<SpawnedWeapon[]>(() => {
    const generatedPositions: [number, number, number][] = [];

    const generatedWeapons: SpawnedWeapon[] = [];

    let seed = 1337;

    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;

      return seed / 233280;
    };

    function seededPosition(): [number, number, number] {
      return [
        (random() - 0.5) * MAP_LIMIT * 2,

        2,

        (random() - 0.5) * MAP_LIMIT * 2,
      ];
    }

    for (let i = 0; i < WEAPON_COUNT; i++) {
      let pos: [number, number, number];

      do {
        pos = seededPosition();
      } while (!isFarEnough(pos, generatedPositions));

      generatedPositions.push(pos);

      const randomType =
        WEAPON_TYPES[Math.floor(random() * WEAPON_TYPES.length)];

      generatedWeapons.push({
        id: `weapon-${i}`,

        type: randomType,

        position: pos,
      });
    }

    return generatedWeapons;
  });

  // REMOVE PICKED WEAPON
  const handlePickup = (weaponId: string) => {
    setWeapons((prev) => prev.filter((weapon) => weapon.id !== weaponId));
  };

  return (
    <>
      {weapons.map((weapon) => (
        <WeaponPickup
          key={weapon.id}
          id={weapon.id}
          type={weapon.type}
          position={weapon.position}
          onPickup={handlePickup}
        />
      ))}
    </>
  );
}
