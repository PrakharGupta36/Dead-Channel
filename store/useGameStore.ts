import * as THREE from "three";
import { create } from "zustand";

export type GunType = "smg" | "ak47" | "pistol";

export interface PhysicsBullet {
  id: string;
  origin: THREE.Vector3;
  direction: THREE.Vector3; // normalized world-space direction
  speed: number; // initial velocity magnitude (m/s)
  damage: number;
  shooterId: string;
  spawnTime: number;
}

export interface HitEvent {
  victimId: string;
  damage: number;
  shooterId: string;
}

export const WEAPON_STATS: Record<
  GunType,
  { damage: number; fireRate: number; speed: number }
> = {
  pistol: { damage: 35, fireRate: 350, speed: 120 },
  smg: { damage: 18, fireRate: 110, speed: 140 },
  ak47: { damage: 28, fireRate: 160, speed: 130 },
};

interface GameStore {
  bullets: PhysicsBullet[];
  spawnBullet: (b: Omit<PhysicsBullet, "id" | "spawnTime">) => void;
  removeBullet: (id: string) => void;

  hitEvents: HitEvent[];
  registerHit: (h: HitEvent) => void;
  clearHits: () => void;

  playerHealths: Record<string, number>;
  setPlayerHealth: (id: string, hp: number) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  bullets: [],

  spawnBullet: (b) =>
    set((s) => ({
      bullets: [
        ...s.bullets,
        { ...b, id: crypto.randomUUID(), spawnTime: performance.now() },
      ].slice(-32),
    })),

  removeBullet: (id) =>
    set((s) => ({ bullets: s.bullets.filter((b) => b.id !== id) })),

  hitEvents: [],
  registerHit: (h) => set((s) => ({ hitEvents: [...s.hitEvents, h] })),
  clearHits: () => set({ hitEvents: [] }),

  playerHealths: {},
  setPlayerHealth: (id, hp) =>
    set((s) => ({ playerHealths: { ...s.playerHealths, [id]: hp } })),
}));
