"use client";

import { PhysicsBullet, useGameStore } from "@/store/useGameStore";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const BULLET_LIFETIME_MS = 7000;

type GLTFResult = {
  nodes: { defaultMaterial: THREE.Mesh };
  materials: { openPBR_shader1: THREE.Material };
};

function directionToQuat(dir: THREE.Vector3): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  return q;
}

// ─── Single physics bullet ───────────────────────────────────────────────────
function PhysicsBulletMesh({ bullet }: { bullet: PhysicsBullet }) {
  const rbRef = useRef<RapierRigidBody>(null);
  const removeBullet = useGameStore((s) => s.removeBullet);
  const { nodes, materials } = useGLTF(
    "/models/Bullet.glb",
  ) as unknown as GLTFResult;

  const worldQuat = useMemo(
    () => directionToQuat(bullet.direction),
    [bullet.direction],
  );

  const initVel = useMemo(
    () => ({
      x: bullet.direction.x * bullet.speed,
      y: bullet.direction.y * bullet.speed,
      z: bullet.direction.z * bullet.speed,
    }),
    [bullet.direction, bullet.speed],
  );

  useEffect(() => {
    const rb = rbRef.current;
    if (!rb) return;
    rb.setLinvel(initVel, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }, [initVel]);

  useEffect(() => {
    const timer = setTimeout(() => removeBullet(bullet.id), BULLET_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [bullet.id, removeBullet]);

  useFrame(() => {
    const rb = rbRef.current;
    if (rb) {
      rb.setRotation(
        { x: worldQuat.x, y: worldQuat.y, z: worldQuat.z, w: worldQuat.w },
        false,
      );
    }
  });

  return (
    <RigidBody
      ref={rbRef}
      position={[bullet.origin.x, bullet.origin.y, bullet.origin.z]}
      gravityScale={0.08}
      linearDamping={0.02}
      angularDamping={1}
      colliders={false}
      ccd={true}
      userData={{
        isBullet: true,
        shooterId: bullet.shooterId,
        damage: bullet.damage,
        bulletId: bullet.id,
      }}
      onCollisionEnter={({ other }) => {
        const otherData = other.rigidBodyObject?.userData;
        if (otherData?.isBullet) return;
        if (otherData?.playerId === bullet.shooterId) return;
        removeBullet(bullet.id);
      }}
      rotation={[0, -2, 1.6]}
      scale={0.2}
    >
      <CuboidCollider args={[0.04, 0.04, 0.3]} />
      <Suspense fallback={null}>
        <group scale={0.15} rotation={[0, -Math.PI / 2, 0]}>
          {/* PLACE YOUR LEVA DERIVED VALUES HERE: */}
          <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh
                castShadow={false}
                receiveShadow={false}
                geometry={nodes.defaultMaterial.geometry}
                material={materials.openPBR_shader1}
                scale={[0.801, 1.084, 0.801]}
              />
            </group>
          </group>
        </group>
      </Suspense>
    </RigidBody>
  );
}

// ─── Muzzle flash ─────────────────────────────────────────────────────────────
function MuzzleFlash({ bullet }: { bullet: PhysicsBullet }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Fire-and-forget gun audio play on component instantiation
  useEffect(() => {
    const audio = new Audio("/sounds/weapons/Bullet.mp3");
    audio.volume = 0.2; // Adjust volume level to balance mix
    audio.play().catch((err) => {
      console.warn(
        "Audio playback blocked by browser autocomplete guardrail:",
        err,
      );
    });
  }, []);

  useFrame(() => {
    const mat = matRef.current;
    const mesh = meshRef.current;
    if (!mat || !mesh) return;
    const elapsed = performance.now() - bullet.spawnTime;
    const t = Math.min(elapsed / 80, 1);
    mat.opacity = 1 - t;
    mesh.scale.setScalar(1 + t * 1.5);
  });

  return (
    <mesh
      ref={meshRef}
      position={[bullet.origin.x - .7, bullet.origin.y - .3, bullet.origin.z]}
      userData={{ isBullet: true }}
    >
      <sphereGeometry args={[0.1, 6, 6]} />
      <meshBasicMaterial
        ref={matRef}
        color="#fff5a0"
        transparent
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Root Bullet System ───────────────────────────────────────────────────────
export default function BulletSystem() {
  const bullets = useGameStore((s) => s.bullets);

  return (
    <group name="bullet-system">
      {bullets.map((b) => (
        <group key={b.id}>
          <PhysicsBulletMesh bullet={b} />
          <MuzzleFlash bullet={b} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/models/Bullet.glb");
