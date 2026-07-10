/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/purity */
"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getTerrainHeight } from "../scene/Ground";

const SIMPLEX_GLSL = /* glsl */ `
  vec3 mod289v3(vec3 x) { return x - floor(x*(1./289.))*289.; }
  vec2 mod289v2(vec2 x) { return x - floor(x*(1./289.))*289.; }
  vec3 permuteV3(vec3 x) { return mod289v3(((x*34.)+1.)*x); }
  float simplex2d(vec2 v) {
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i  = floor(v + dot(v,C.yy));
    vec2 x0 = v - i + dot(i,C.xx);
    vec2 i1 = (x0.x>x0.y) ? vec2(1.,0.) : vec2(0.,1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289v2(i);
    vec3 p = permuteV3(permuteV3(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
    vec3 m = max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m=m*m; m=m*m;
    vec3 x = 2.*fract(p*C.www)-1.;
    vec3 h = abs(x)-.5;
    vec3 ox = floor(x+.5);
    vec3 a0 = x-ox;
    m *= 1.79284291400159-.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x  = a0.x *x0.x  + h.x *x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.*dot(m,g);
  }
`;

const globalWindUniforms = {
  uTime: { value: 0 },
  uWindStrength: { value: new THREE.Vector3(0.3, 0, 0.3) },
  uWindFrequency: { value: 1.0 },
  uWindScale: { value: 400.0 },
};

function buildWindMaterial(
  base: THREE.MeshBasicMaterial,
): THREE.MeshBasicMaterial {
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = globalWindUniforms.uTime;
    shader.uniforms.uWindStrength = globalWindUniforms.uWindStrength;
    shader.uniforms.uWindFrequency = globalWindUniforms.uWindFrequency;
    shader.uniforms.uWindScale = globalWindUniforms.uWindScale;

    shader.vertexShader =
      `
      uniform float uTime;
      uniform vec3 uWindStrength;
      uniform float uWindFrequency;
      uniform float uWindScale;
    \n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      `void main() {`,
      SIMPLEX_GLSL + `\nvoid main() {`,
    );

    const projectVertex = /* glsl */ `
      vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
      float windOffset = 6.2831853 * simplex2d((modelMatrix * mvPosition).xz / uWindScale);
      vec3 windSway = position.y * uWindStrength *
        sin(uTime * uWindFrequency + windOffset) *
        cos(uTime * 1.4 * uWindFrequency + windOffset);
      mvPosition.xyz += windSway;
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    `;

    shader.vertexShader = shader.vertexShader.replace(
      `#include <project_vertex>`,
      projectVertex,
    );
  };
  return base;
}

export interface GrassOptions {
  instanceCount?: number;
  maxInstanceCount?: number;
  scale?: number;
  size?: { x: number; y: number; z: number };
  sizeVariation?: { x: number; y: number; z: number };
  chunkDivisions?: number;
  maxRenderDistance?: number;
}

const DEFAULTS: Required<GrassOptions> = {
  instanceCount: 75000,
  maxInstanceCount: 90000,
  scale: 200,
  size: { x: 0.9, y: 0.8, z: 0.9 },
  sizeVariation: { x: 0.2, y: 0.3, z: 0.2 },
  chunkDivisions: 8, // 8x8 = 64 independently-cullable InstancedMesh chunks
  maxRenderDistance: 140, // world units — chunks beyond this stop rendering
};

interface GrassChunk {
  mesh: THREE.InstancedMesh;
  center: THREE.Vector3;
}

export function GrassField(props: GrassOptions) {
  const opts = { ...DEFAULTS, ...props } as Required<GrassOptions>;
  const { scene: grassScene } = useGLTF("/models/Grass.glb");
  const chunksRef = useRef<GrassChunk[]>([]);

  const chunks = useMemo(() => {
    const sourceMesh = grassScene.children[0] as THREE.Mesh;
    if (!sourceMesh?.geometry) return [];

    sourceMesh.geometry.computeBoundingBox();
    sourceMesh.geometry.computeBoundingSphere();

    // One shared material → one shader compile total. Building a fresh
    // MeshBasicMaterial per chunk (as a naive chunked version would) forces
    // a separate onBeforeCompile shader program compilation per chunk —
    // 64 compiles instead of 1 — and prevents the renderer from keeping the
    // same GL program bound across draw calls.
    const sharedMaterial = buildWindMaterial(
      new THREE.MeshBasicMaterial({
        map: (sourceMesh.material as THREE.MeshBasicMaterial).map,
        transparent: false,
        alphaTest: 0.6,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
      }),
    );

    const divisions = Math.max(1, Math.floor(opts.chunkDivisions));
    const totalChunks = divisions * divisions;
    const chunkSize = opts.scale / divisions;
    const halfScale = opts.scale * 0.5;

    const instancesPerChunk = Math.ceil(opts.instanceCount / totalChunks);
    const maxPerChunk = Math.ceil(opts.maxInstanceCount / totalChunks);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const result: GrassChunk[] = [];

    for (let cx = 0; cx < divisions; cx++) {
      for (let cz = 0; cz < divisions; cz++) {
        const chunkMinX = -halfScale + cx * chunkSize;
        const chunkMinZ = -halfScale + cz * chunkSize;

        const mesh = new THREE.InstancedMesh(
          sourceMesh.geometry,
          sharedMaterial,
          maxPerChunk,
        );

        // Generate directly inside this chunk's rectangle instead of
        // scattering globally then filtering — the original filter
        // (`Math.abs(px) > halfScale`) could never actually trigger since
        // px was already constrained to that exact range, so it was a
        // no-op check, not a bounds guard.
        let placed = 0;
        for (let i = 0; i < instancesPerChunk; i++) {
          const px = chunkMinX + Math.random() * chunkSize;
          const pz = chunkMinZ + Math.random() * chunkSize;
          const py = getTerrainHeight(px, pz);

          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, Math.random() * 6.28318, 0);
          dummy.scale.set(
            opts.sizeVariation.x * Math.random() + opts.size.x,
            opts.sizeVariation.y * Math.random() + opts.size.y,
            opts.sizeVariation.z * Math.random() + opts.size.z,
          );
          dummy.updateMatrix();

          color.setRGB(
            0.18 + Math.random() * 0.08,
            0.24 + Math.random() * 0.15,
            0.08,
          );

          mesh.setMatrixAt(placed, dummy.matrix);
          mesh.setColorAt(placed, color);
          placed++;
        }

        mesh.count = placed;

        // Instance transforms never change after setup — grass doesn't
        // move — so hint the driver these buffers are write-once instead
        // of the default "changes every frame" assumption.
        mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
          mesh.instanceColor.setUsage(THREE.StaticDrawUsage);
          mesh.instanceColor.needsUpdate = true;
        }

        // Real per-chunk frustum culling: computed from this chunk's own
        // instance matrices, so the renderer can skip an entire chunk's
        // draw call when it's off-screen instead of treating all ~75k
        // blades as one always-visible object (InstancedMesh's default
        // bounding sphere comes from the single blade geometry and doesn't
        // account for spread-out instances, so without this the whole
        // field either never culls or culls incorrectly).
        mesh.computeBoundingSphere();
        mesh.frustumCulled = true;

        // Mesh transform itself is identity and static — skip the
        // per-frame local matrix recompute React Three Fiber would
        // otherwise do via matrixAutoUpdate.
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();

        mesh.castShadow = false;
        mesh.receiveShadow = false;

        result.push({
          mesh,
          center: new THREE.Vector3(
            chunkMinX + chunkSize / 2,
            0,
            chunkMinZ + chunkSize / 2,
          ),
        });
      }
    }

    // eslint-disable-next-line react-hooks/refs
    chunksRef.current = result;
    return result;
  }, [grassScene]);

  useFrame(({ clock, camera }) => {
    globalWindUniforms.uTime.value = clock.getElapsedTime();

    const maxDistSq = opts.maxRenderDistance * opts.maxRenderDistance;
    for (const chunk of chunksRef.current) {
      const dx = camera.position.x - chunk.center.x;
      const dz = camera.position.z - chunk.center.z;
      chunk.mesh.visible = dx * dx + dz * dz < maxDistSq;
    }
  });

  if (chunks.length === 0) return null;

  return (
    <>
      {chunks.map((chunk, i) => (
        <primitive key={i} object={chunk.mesh} />
      ))}
    </>
  );
}

GrassField.preload = () => {
  useGLTF.preload("/models/Grass.glb");
};
