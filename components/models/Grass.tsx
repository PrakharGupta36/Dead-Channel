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

    // Instanced specific high-speed positional sway mapping code block injection
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
}

const DEFAULTS: Required<GrassOptions> = {
  instanceCount: 75000,
  maxInstanceCount: 90000,
  scale: 300,
  size: { x: 0.9, y: 0.8, z: 0.9 },
  sizeVariation: { x: 0.2, y: 0.3, z: 0.2 },
};

export function GrassField(props: GrassOptions) {
  const opts = { ...DEFAULTS, ...props } as Required<GrassOptions>;
  const { scene: grassScene } = useGLTF("/models/Grass.glb");
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // 1. Visually build the InstancedMesh parameters once via useMemo
  const grassMesh = useMemo(() => {
    const sourceMesh = grassScene.children[0] as THREE.Mesh;
    if (!sourceMesh?.geometry) return null;

    // OPTIMIZATION: Switched Phong to Basic to completely bypass lighting calculation overdraw loops
    const baseMat = new THREE.MeshBasicMaterial({
      map: (sourceMesh.material as THREE.MeshBasicMaterial).map,
      transparent: false,
      alphaTest: 0.6, // Higher cutoff discards fuzzy pixels earlier
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    const mat = buildWindMaterial(baseMat);
    const mesh = new THREE.InstancedMesh(
      sourceMesh.geometry,
      mat,
      opts.maxInstanceCount,
    );

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let count = 0;

    // Use single float allocations inside loop iterations to prevent GC churn sweeps
    const halfScale = opts.scale * 0.5;

    for (let i = 0; i < opts.maxInstanceCount; i++) {
      const px = (Math.random() - 0.5) * opts.scale;
      const pz = (Math.random() - 0.5) * opts.scale;

      // Fast check out-of-bounds math logic sweep optimization
      if (Math.abs(px) > halfScale || Math.abs(pz) > halfScale) continue;

      const py = getTerrainHeight(px, pz);

      dummy.position.set(px, py, pz);
      dummy.rotation.set(0, Math.random() * 6.28318, 0);
      dummy.scale.set(
        opts.sizeVariation.x * Math.random() + opts.size.x,
        opts.sizeVariation.y * Math.random() + opts.size.y,
        opts.sizeVariation.z * Math.random() + opts.size.z,
      );
      dummy.updateMatrix();

      // Variations of lush wilderness greens matching vertex ranges natively
      color.setRGB(
        0.18 + Math.random() * 0.08,
        0.24 + Math.random() * 0.15,
        0.08,
      );

      mesh.setMatrixAt(count, dummy.matrix);
      mesh.setColorAt(count, color);
      count++;
    }

    mesh.count = Math.min(opts.instanceCount, count);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Explicitly disable heavy shadow rendering maps for mass instanced micro items
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    return mesh;
  }, [grassScene]);

  // 2. Direct fast tick update thread binding loops
  useFrame(({ clock }) => {
    globalWindUniforms.uTime.value = clock.getElapsedTime();
  });

  if (!grassMesh) return null;

  return <primitive object={grassMesh} ref={meshRef} />;
}

GrassField.preload = () => {
  useGLTF.preload("/models/Grass.glb");
};
