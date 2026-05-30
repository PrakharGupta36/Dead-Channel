"use client";

/**
 * InstancedGrass — 3-LOD, 60 fps, smooth rebuild
 *
 * LOD0  0 – 14 m   full 9-vert blade    dense  (~900 blades/chunk)
 * LOD1 12 – 32 m   simplified 6-vert    medium (~300 blades/chunk)
 * LOD2 28 – 55 m   billboard 3-vert     sparse (~80  blades/chunk)
 *
 * Key design decisions
 * ────────────────────
 * • Each LOD is an independent InstancedMesh. The GPU only draws what's
 *   actually visible; adding radius/density doesn't hurt the other LODs.
 *
 * • Rebuild is triggered per-LOD when the player drifts > chunkSize * 0.5
 *   (a larger threshold than before).  The vertex shader fades blades in/out
 *   via a per-blade staggered alpha driven by `uRevealSeed`, so the CPU-side
 *   buffer swap is invisible.
 *
 * • The "ring artifact" was caused by the interaction-bend pushing blades
 *   underground near the player. Fixed: the bend is now purely horizontal
 *   (no Y component) and uses heightInfluence so only tips move.
 *
 * • `uLodInner` / `uLodOuter` give each LOD a soft inner fade so adjacent
 *   LODs cross-fade instead of popping.
 *
 * • Transparent blades are discarded in the fragment shader (alpha test)
 *   to avoid expensive overdraw.
 */

import { grassFragmentShader } from "@/lib/shaders/grass/grass-fragment";
import { grassVertexShader } from "@/lib/shaders/grass/grass-vertex";
import { useFrame } from "@react-three/fiber";
import { FC, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// ── Types ────────────────────────────────────────────────────────────────────

interface InstancedGrassProps {
  playerRef: React.RefObject<THREE.Object3D | null>;
  /** Outer visible radius. Performance cost is essentially constant regardless
   *  of this value because the instance count per LOD is capped independently. */
  visibleRadius?: number;
  /** Density multiplier 0–2. 1 = default. Affects all LODs proportionally. */
  densityScale?: number;
}

// ── LOD configuration ────────────────────────────────────────────────────────

interface LodConfig {
  /** Inner band start (soft fade-in begins here) */
  inner: number;
  /** Outer band limit (hard cut; fragment alpha handles the soft part) */
  outer: number;
  blades: number; // instances per chunk
  chunkSize: number;
  geometry: "full" | "mid" | "billboard";
}

const LOD_DEFS: LodConfig[] = [
  { inner: 0, outer: 16, blades: 900, chunkSize: 6, geometry: "full" },
  { inner: 12, outer: 34, blades: 280, chunkSize: 8, geometry: "mid" },
  { inner: 28, outer: 58, blades: 70, chunkSize: 12, geometry: "billboard" },
];

const MAX_INSTANCES_PER_LOD = [120_000, 140_000, 80_000] as const;

// ── PRNG ─────────────────────────────────────────────────────────────────────

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── Player / camera position helper ─────────────────────────────────────────

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

// ── Rebuild helper ───────────────────────────────────────────────────────────

function rebuildLod(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  centerX: number,
  centerZ: number,
  lod: LodConfig,
  maxInstances: number,
  densityScale: number,
): number {
  const { chunkSize, inner, outer, blades } = lod;
  const scaledBlades = Math.max(1, Math.round(blades * densityScale));
  const chunkRange = Math.ceil(outer / chunkSize);
  const innerR2 = inner * inner;
  const outerR2 = outer * outer;

  const centerChunkX = Math.floor(centerX / chunkSize);
  const centerChunkZ = Math.floor(centerZ / chunkSize);

  let idx = 0;

  for (let cx = -chunkRange; cx <= chunkRange && idx < maxInstances; cx++) {
    for (let cz = -chunkRange; cz <= chunkRange && idx < maxInstances; cz++) {
      const chunkX = centerChunkX + cx;
      const chunkZ = centerChunkZ + cz;
      const worldCX = chunkX * chunkSize;
      const worldCZ = chunkZ * chunkSize;

      // Quick chunk-centre distance test
      const dx = worldCX + chunkSize * 0.5 - centerX;
      const dz = worldCZ + chunkSize * 0.5 - centerZ;
      const d2 = dx * dx + dz * dz;
      if (d2 > outerR2) continue;

      const seed =
        (((chunkX * 73856093) ^ (chunkZ * 19349663)) >>> 0) * 2654435761;
      const rng = prng(seed);

      for (let i = 0; i < scaledBlades && idx < maxInstances; i++) {
        const bx = worldCX + rng() * chunkSize;
        const bz = worldCZ + rng() * chunkSize;
        const ex = bx - centerX;
        const ez = bz - centerZ;
        const be2 = ex * ex + ez * ez;

        // Skip blades outside the LOD ring entirely (inner chunks may overlap)
        if (be2 > outerR2) continue;
        // For LOD1+ skip blades that are fully inside a tighter inner band
        // (they will be covered by the denser LOD below)
        if (inner > 0 && be2 < innerR2 * 0.7) continue;

        dummy.position.set(bx, 0, bz);
        dummy.rotation.y = rng() * Math.PI * 2;
        dummy.scale.setScalar(0.8 + rng() * 0.45);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
  }
  return idx;
}

// ── Geometry factories ────────────────────────────────────────────────────────

function makeGrassGeo(kind: LodConfig["geometry"]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const hw = 0.1;
  const h = 0.9;

  let positions: Float32Array;

  switch (kind) {
    case "full":
      // 3 quads → 9 vertices (same as original)
      positions = new Float32Array([
        -hw,
        0,
        0,
        hw,
        0,
        0,
        -hw * 0.5,
        h * 0.4,
        0,
        hw,
        0,
        0,
        hw * 0.5,
        h * 0.4,
        0,
        -hw * 0.5,
        h * 0.4,
        0,
        -hw * 0.5,
        h * 0.4,
        0,
        hw * 0.5,
        h * 0.4,
        0,
        0,
        h,
        0,
      ]);
      break;
    case "mid":
      // 2 quads → 6 vertices
      positions = new Float32Array([
        -hw,
        0,
        0,
        hw,
        0,
        0,
        0,
        h * 0.5,
        0,
        -hw * 0.5,
        h * 0.5,
        0,
        hw * 0.5,
        h * 0.5,
        0,
        0,
        h,
        0,
      ]);
      break;
    case "billboard":
    default:
      // Single tri → 3 vertices  (cheapest possible)
      positions = new Float32Array([-hw, 0, 0, hw, 0, 0, 0, h, 0]);
      break;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// ── Component ────────────────────────────────────────────────────────────────

export const InstancedGrass: FC<InstancedGrassProps> = ({
  playerRef,
  visibleRadius = 58,
  densityScale = 1.0,
}) => {
  // Per-LOD refs
  const meshRefs = [
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
    useRef<THREE.InstancedMesh>(null),
  ] as const;

  const matRefs = useRef<(THREE.ShaderMaterial | null)[]>([null, null, null]);

  const dummy = useRef(new THREE.Object3D()).current;

  // Smooth-follow state
  const currentCenter = useRef(new THREE.Vector3()).current;
  const targetCenter = useRef(new THREE.Vector3()).current;
  const needsInitBuild = useRef(true);
  const lastRebuildPos = useRef([
    new THREE.Vector3(Infinity, 0, Infinity),
    new THREE.Vector3(Infinity, 0, Infinity),
    new THREE.Vector3(Infinity, 0, Infinity),
  ]);

  // Reveal seed (increments on each rebuild to trigger staggered fade-in)
  const revealSeeds = useRef([0, 0, 0]);

  // Interaction
  const interactionPoint = useRef(new THREE.Vector3()).current;
  const interactionRadius = 1.8;
  const interactionStrength = 0.9;

  // ── Geometries ──────────────────────────────────────────────────────────────
  const geos = useMemo(() => LOD_DEFS.map((l) => makeGrassGeo(l.geometry)), []);

  // ── Materials (one per LOD so uniforms are independent) ────────────────────
  const materials = useMemo(() => {
    return LOD_DEFS.map(
      (lod) =>
        new THREE.ShaderMaterial({
          vertexShader: grassVertexShader,
          fragmentShader: grassFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uFrequency: { value: new THREE.Vector2(3, 3) },
            uSpeed: { value: 3.0 },
            // Tip: warm yellow-green like sunlit grass
            uTipColor: { value: new THREE.Color("#7ec850") },
            // Mid: rich lush green
            uBaseColor: { value: new THREE.Color("#2d7a3a") },
            // Fog: muted mid-green
            uFogColor: { value: new THREE.Color("#3a6e3a") },
            uHalfWidth: { value: 0.1 },
            uViewMatrix: { value: new THREE.Matrix4() },
            uProjectionMatrix: { value: new THREE.Matrix4() },
            // Interaction
            uInteractionPoint: { value: new THREE.Vector3() },
            uInteractionRadius: { value: interactionRadius },
            uInteractionStrength: { value: interactionStrength },
            // Fade
            uPlayerPosition: { value: new THREE.Vector3() },
            uVisibleRadius: { value: lod.outer },
            uFadeWidth: { value: 4.0 },
            // LOD band
            uLodInner: { value: lod.inner },
            uLodOuter: { value: lod.outer },
            // Smooth reveal
            uRevealSeed: { value: 0 },
          },
          side: THREE.DoubleSide,
          // alphaTest: discard via shader 'discard' statement already handles
          // near-zero alpha; keep depthWrite on so grass sorts correctly with
          // opaque geometry (trees, player, ground).
          transparent: true,
          depthWrite: true,
          alphaTest: 0.02,
        }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    materials.forEach((m, i) => {
      matRefs.current[i] = m;
    });
  }, [materials]);

  // ── Frame loop ──────────────────────────────────────────────────────────────
  useFrame(({ camera, clock }, delta) => {
    const elapsed = clock.getElapsedTime();

    // 1. Raw player position
    getGrassCenter(playerRef, camera, targetCenter);

    // 2. Smooth-follow (lerp current → target)
    if (needsInitBuild.current) {
      currentCenter.copy(targetCenter);
      needsInitBuild.current = false;
    } else {
      currentCenter.lerp(targetCenter, 1.0 - Math.exp(-5.0 * delta));
    }

    // 3. Interaction point snaps directly to player (immediate bending)
    getGrassCenter(playerRef, camera, interactionPoint);

    // 4. Update material uniforms (all LODs share same world-space values)
    matRefs.current.forEach((mat, i) => {
      if (!mat) return;
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);
      mat.uniforms.uProjectionMatrix.value.copy(camera.projectionMatrix);
      mat.uniforms.uInteractionPoint.value.copy(interactionPoint);
      mat.uniforms.uPlayerPosition.value.copy(interactionPoint);
      mat.uniforms.uRevealSeed.value = revealSeeds.current[i];
    });

    // 5. Per-LOD conditional rebuild
    const cx = currentCenter.x;
    const cz = currentCenter.z;

    LOD_DEFS.forEach((lod, i) => {
      const mesh = meshRefs[i].current;
      if (!mesh) return;

      const threshold = lod.chunkSize * 0.5; // rebuild only every half-chunk move
      const dx = cx - lastRebuildPos.current[i].x;
      const dz = cz - lastRebuildPos.current[i].z;

      if (dx * dx + dz * dz > threshold * threshold) {
        revealSeeds.current[i] += 1; // new seed → staggered reveal in shader

        const count = rebuildLod(
          mesh,
          dummy,
          cx,
          cz,
          lod,
          MAX_INSTANCES_PER_LOD[i],
          densityScale,
        );
        mesh.count = count;
        mesh.instanceMatrix.needsUpdate = true;

        if (matRefs.current[i]) {
          matRefs.current[i]!.uniforms.uRevealSeed.value =
            revealSeeds.current[i];
        }

        lastRebuildPos.current[i].set(cx, 0, cz);
      }
    });
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {LOD_DEFS.map((_, i) => (
        <instancedMesh
          key={i}
          ref={meshRefs[i] as React.RefObject<THREE.InstancedMesh>}
          args={[geos[i], materials[i], MAX_INSTANCES_PER_LOD[i]]}
          frustumCulled={false}
          castShadow={i === 0} // only dense LOD casts shadows
          receiveShadow
        />
      ))}
    </>
  );
};
