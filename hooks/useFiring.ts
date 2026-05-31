"use client";

import { GunType, WEAPON_STATS, useGameStore } from "@/store/useGameStore";
import { useThree } from "@react-three/fiber";
import { getState, setState } from "playroomkit";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

const _screenCenter = new THREE.Vector2(0, 0);
const _aimRaycaster = new THREE.Raycaster();
const _hitRaycaster = new THREE.Raycaster();
const _aimDir = new THREE.Vector3();
const _muzzleOrigin = new THREE.Vector3();
const _fireDir = new THREE.Vector3();

interface UseFiringOptions {
  weapon: GunType | null;
  playerId: string;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  otherPlayerMeshes: React.MutableRefObject<Record<string, THREE.Object3D>>;
  enabled?: boolean;
}

export function useFiring({
  weapon,
  playerId,
  playerPositionRef,
  otherPlayerMeshes,
  enabled = true,
}: UseFiringOptions) {
  const { camera, scene } = useThree();
  const spawnBullet = useGameStore((s) => s.spawnBullet);
  const registerHit = useGameStore((s) => s.registerHit);

  const lastFireTime = useRef(0);
  const firingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerFire = useCallback(() => {
    if (!weapon || !enabled) return;

    const stats = WEAPON_STATS[weapon];
    const now = performance.now();
    if (now - lastFireTime.current < stats.fireRate) return;
    lastFireTime.current = now;

    // Screen-centre ray = what the crosshair is pointing at
    _aimRaycaster.setFromCamera(_screenCenter, camera);
    _aimDir.copy(_aimRaycaster.ray.direction).normalize();

    // Bullet origin = player chest/eye, NOT camera orbit point
    const playerPos = playerPositionRef.current;
    _muzzleOrigin.set(playerPos.x, playerPos.y + 1.2, playerPos.z);

    // Cast from camera through crosshair to find target point
    _hitRaycaster.set(_aimRaycaster.ray.origin, _aimDir);

    let hitVictimId: string | null = null;
    let targetPoint: THREE.Vector3 | null = null;

    const meshes = Object.values(otherPlayerMeshes.current);
    if (meshes.length > 0) {
      const playerHits = _hitRaycaster.intersectObjects(meshes, true);
      if (playerHits.length > 0) {
        targetPoint = playerHits[0].point.clone();
        let obj: THREE.Object3D | null = playerHits[0].object;
        while (obj) {
          const id = obj.userData?.playerId as string | undefined;
          if (id && id !== playerId) {
            hitVictimId = id;
            break;
          }
          obj = obj.parent;
        }
      }
    }

    if (!targetPoint) {
      const envHits = _hitRaycaster.intersectObjects(scene.children, true);
      const envHit = envHits.find(
        (h) => !h.object.userData?.isPlayer && !h.object.userData?.isBullet,
      );
      if (envHit) targetPoint = envHit.point.clone();
    }

    // Direction from muzzle to target (or straight aim dir if nothing hit)
    if (targetPoint) {
      _fireDir.subVectors(targetPoint, _muzzleOrigin).normalize();
    } else {
      _fireDir.copy(_aimDir);
    }

    // Spawn physics bullet
    spawnBullet({
      origin: _muzzleOrigin.clone(),
      direction: _fireDir.clone(),
      speed: stats.speed,
      damage: stats.damage,
      shooterId: playerId,
    });

    if (hitVictimId) {
      registerHit({
        victimId: hitVictimId,
        damage: stats.damage,
        shooterId: playerId,
      });
      const currentHits: Array<{
        victimId: string;
        damage: number;
        shooterId: string;
        ts: number;
      }> = (getState("hitEvents") as typeof currentHits) ?? [];
      setState("hitEvents", [
        ...currentHits,
        {
          victimId: hitVictimId,
          damage: stats.damage,
          shooterId: playerId,
          ts: now,
        },
      ]);
    }

    setState(`lastShot_${playerId}`, {
      origin: _muzzleOrigin.toArray(),
      direction: _fireDir.toArray(),
      weapon,
      ts: now,
    });
  }, [
    weapon,
    enabled,
    camera,
    scene,
    playerId,
    playerPositionRef,
    otherPlayerMeshes,
    spawnBullet,
    registerHit,
  ]);

  const startFiring = useCallback(() => {
    if (firingRef.current) return;
    firingRef.current = true;
    triggerFire();
    const rate = weapon ? WEAPON_STATS[weapon].fireRate : 200;
    intervalRef.current = setInterval(triggerFire, rate);
  }, [triggerFire, weapon]);

  const stopFiring = useCallback(() => {
    firingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) startFiring();
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) stopFiring();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyQ" && !e.repeat) startFiring();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyQ") stopFiring();
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      stopFiring();
    };
  }, [enabled, startFiring, stopFiring]);

  useEffect(() => {
    if (firingRef.current) {
      stopFiring();
      startFiring();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weapon]);

  return { triggerFire };
}
