import { grassFragmentShader } from "@/lib/shaders/grass/grass-fragment";
import { grassVertexShader } from "@/lib/shaders/grass/grass-vertex";
import { useFrame } from "@react-three/fiber";
import { FC, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

interface InstancedGrassProps {
  playerRef: React.RefObject<THREE.Object3D | null>;
  visibleRadius?: number;
  instancesPerChunk?: number;
}

const GRASS_CONFIG = {
  chunkSize: 8,
  maxInstances: 250000,
} as const;

// ---------- PRNG ----------
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    s >>>= 0;
    return s / 0x100000000;
  };
}

// ---------- Smart grass‑center reader (player or camera fallback) ----------
function getGrassCenter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef: React.RefObject<THREE.Object3D | any>,
  camera: THREE.Camera,
  target: THREE.Vector3,
) {
  const obj = playerRef.current;

  if (obj) {
    if (typeof obj.translation === "function") {
      const t = obj.translation();
      target.set(t.x, t.y, t.z);
      return;
    }
    if (obj.isObject3D) {
      obj.getWorldPosition(target);
      return;
    }
    if (typeof obj.x === "number") {
      target.set(obj.x, obj.y ?? 0, obj.z ?? 0);
      return;
    }
  }

  target.copy(camera.position);
}

// ---------- Rebuild instances around a given centre ----------
function rebuildGrassMatrices(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  centerX: number,
  centerZ: number,
  visibleRadius: number,
  instancesPerChunk: number,
): number {
  const { chunkSize, maxInstances } = GRASS_CONFIG;

  const centerChunkX = Math.floor(centerX / chunkSize);
  const centerChunkZ = Math.floor(centerZ / chunkSize);
  const chunkRange = Math.ceil(visibleRadius / chunkSize);
  const r2 = visibleRadius * visibleRadius;

  let idx = 0;

  for (let cx = -chunkRange; cx <= chunkRange; cx++) {
    for (let cz = -chunkRange; cz <= chunkRange; cz++) {
      if (idx >= maxInstances) break;

      const chunkX = centerChunkX + cx;
      const chunkZ = centerChunkZ + cz;
      const worldChunkX = chunkX * chunkSize;
      const worldChunkZ = chunkZ * chunkSize;

      const dx = worldChunkX + chunkSize * 0.5 - centerX;
      const dz = worldChunkZ + chunkSize * 0.5 - centerZ;
      if (dx * dx + dz * dz > r2) continue;

      const seed =
        (((chunkX * 73856093) ^ (chunkZ * 19349663)) >>> 0) * 2654435761;
      const rng = prng(seed);

      for (let i = 0; i < instancesPerChunk; i++) {
        if (idx >= maxInstances) break;

        const localX = rng() * chunkSize;
        const localZ = rng() * chunkSize;
        const x = worldChunkX + localX;
        const z = worldChunkZ + localZ;

        const bx = x - centerX;
        const bz = z - centerZ;
        if (bx * bx + bz * bz > r2) continue;

        dummy.position.set(x, 0, z);
        dummy.rotation.y = rng() * Math.PI * 2;
        dummy.scale.setScalar(0.85 + rng() * 0.4);
        dummy.updateMatrix();

        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
  }
  return idx;
}

// ─────────────────────────────────────────────
export const InstancedGrass: FC<InstancedGrassProps> = ({
  playerRef,
  visibleRadius = 50,
  instancesPerChunk = 1750,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const dummy = useRef(new THREE.Object3D()).current;

  // Smooth‑follow state
  const currentGrassCenter = useRef(new THREE.Vector3()).current;
  const targetGrassCenter = useRef(new THREE.Vector3()).current;
  const lastRebuildPos = useRef(new THREE.Vector3());
  const needsInitialBuild = useRef(true);

  // Interaction uniforms
  const interactionPoint = useRef(new THREE.Vector3()).current;
  const interactionRadius = useRef(1.5);
  const interactionStrength = useRef(0.8);

  const halfWidth = 0.1;
  const bladeHeight = 1.0;

  // ---------- Geometry ----------
  const grassGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      -halfWidth,
      0,
      0,
      halfWidth,
      0,
      0,
      -halfWidth * 0.5,
      bladeHeight * 0.4,
      0,
      halfWidth,
      0,
      0,
      halfWidth * 0.5,
      bladeHeight * 0.4,
      0,
      -halfWidth * 0.5,
      bladeHeight * 0.4,
      0,
      -halfWidth * 0.5,
      bladeHeight * 0.4,
      0,
      halfWidth * 0.5,
      bladeHeight * 0.4,
      0,
      0,
      bladeHeight,
      0,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // ---------- Material (add uPlayerPosition and uVisibleRadius) ----------
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uFrequency: { value: new THREE.Vector2(3, 3) },
        uSpeed: { value: 2.0 },
        uTipColor: { value: new THREE.Color("#22c55e") },
        uBaseColor: { value: new THREE.Color("#166534") },
        uHalfWidth: { value: halfWidth },
        uFogColor: { value: new THREE.Color("#15803d") },
        uViewMatrix: { value: new THREE.Matrix4() },
        uProjectionMatrix: { value: new THREE.Matrix4() },
        // Interaction
        uInteractionPoint: { value: new THREE.Vector3(0, 0, 0) },
        uInteractionRadius: { value: 1.5 },
        uInteractionStrength: { value: 0.8 },
        // Circle fade
        uPlayerPosition: { value: new THREE.Vector3(0, 0, 0) },
        uVisibleRadius: { value: visibleRadius },
        uFadeWidth: { value: 5.0 },
      },
      side: THREE.DoubleSide,
    });
  }, [visibleRadius]); // <-- visibleRadius is a prop, include it in deps

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  // ---------- Frame loop ----------
  useFrame(({ camera, clock }, delta) => {
    if (!meshRef.current) return;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uViewMatrix.value.copy(
        camera.matrixWorldInverse,
      );
      materialRef.current.uniforms.uProjectionMatrix.value.copy(
        camera.projectionMatrix,
      );
    }

    // 1. Where the player (or camera) actually is
    getGrassCenter(playerRef, camera, targetGrassCenter);

    // 2. Smoothly move the circle's centre towards the player
    if (needsInitialBuild.current) {
      currentGrassCenter.copy(targetGrassCenter);
      needsInitialBuild.current = false;
    } else {
      const lerpFactor = 1.0 - Math.exp(-4.0 * delta);
      currentGrassCenter.lerp(targetGrassCenter, lerpFactor);
    }

    // 3. Interaction point (snap directly to player for immediate bending)
    getGrassCenter(playerRef, camera, interactionPoint);

    if (materialRef.current) {
      // Interaction bending
      materialRef.current.uniforms.uInteractionPoint.value.copy(
        interactionPoint,
      );
      materialRef.current.uniforms.uInteractionRadius.value =
        interactionRadius.current;
      materialRef.current.uniforms.uInteractionStrength.value =
        interactionStrength.current;

      // Circle edge fade – uses the same player position
      materialRef.current.uniforms.uPlayerPosition.value.copy(interactionPoint);
      materialRef.current.uniforms.uVisibleRadius.value = visibleRadius;
      materialRef.current.uniforms.uFadeWidth.value = 5.0;
    }

    // 4. Rebuild instances around the smoothly interpolated centre
    const cx = currentGrassCenter.x;
    const cz = currentGrassCenter.z;
    const dx = cx - lastRebuildPos.current.x;
    const dz = cz - lastRebuildPos.current.z;
    const DISTANCE_THRESHOLD = GRASS_CONFIG.chunkSize * 0.25; // 2m

    if (dx * dx + dz * dz > DISTANCE_THRESHOLD * DISTANCE_THRESHOLD) {
      const liveCount = rebuildGrassMatrices(
        meshRef.current,
        dummy,
        cx,
        cz,
        visibleRadius,
        instancesPerChunk,
      );
      meshRef.current.count = liveCount;
      meshRef.current.instanceMatrix.needsUpdate = true;
      lastRebuildPos.current.set(cx, 0, cz);
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[grassGeo, material, GRASS_CONFIG.maxInstances]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
};
