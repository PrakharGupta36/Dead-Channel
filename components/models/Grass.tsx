"use client";

import { useFrame } from "@react-three/fiber";
import { FC, useMemo, useRef } from "react";
import * as THREE from "three";

interface RapierRigidBodyLike {
  translation: () => { x: number; y: number; z: number };
  getWorldPosition?: (target: THREE.Vector3) => THREE.Vector3;
}

interface GrassFieldProps {
  playerRef: React.RefObject<THREE.Object3D | RapierRigidBodyLike | null>;
  visibleRadius?: number;
  densityScale?: number;
}

export const InstancedGrass: FC<GrassFieldProps> = ({
  playerRef,
  visibleRadius = 45,
  densityScale = 1.0,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const playerPos = useRef(new THREE.Vector3());

  // Derive static grid density
  const baseCount = 80000;
  const density = useMemo(() => {
    const side = Math.round(Math.sqrt(baseCount * densityScale));
    return side * side;
  }, [densityScale]);

  // Low-poly blade geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const hw = 0.08;
    const h = 0.85;

    const vertices = new Float32Array([
      -hw,
      0,
      0,
      hw,
      0,
      0,
      -hw * 0.6,
      h * 0.45,
      0,
      hw * 0.6,
      h * 0.45,
      0,
      0,
      h,
      0,
    ]);

    const indices = [0, 1, 2, 1, 3, 2, 2, 3, 4];

    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Initialize flat layout slots from -visibleRadius to +visibleRadius
  const material = useMemo(() => {
    const instanceOffsets = new Float32Array(density * 2);
    const side = Math.round(Math.sqrt(density));

    for (let i = 0; i < density; i++) {
      const cx = i % side;
      const cz = Math.floor(i / side);

      const pctX = cx / (side - 1) - 0.5;
      const pctZ = cz / (side - 1) - 0.5;

      instanceOffsets[i * 2] = pctX * visibleRadius * 2.0;
      instanceOffsets[i * 2 + 1] = pctZ * visibleRadius * 2.0;
    }

    const instOffsetAttr = new THREE.InstancedBufferAttribute(
      instanceOffsets,
      2,
    );
    geometry.setAttribute("aInstanceOffset", instOffsetAttr);

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3() },
        uRadius: { value: visibleRadius },
        uBaseColor: { value: new THREE.Color("#135925") },
        uTipColor: { value: new THREE.Color("#5cd46e") },
        uFogColor: { value: new THREE.Color("#3a6e3a") },
      },
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.05,
    });
  }, [geometry, density, visibleRadius]);

  useFrame(({ clock, camera }) => {
    const mat = matRef.current;
    if (!mat) return;

    const elapsed = clock.getElapsedTime();
    const currentTarget = playerRef.current;

    if (currentTarget) {
      if (
        "translation" in currentTarget &&
        typeof currentTarget.translation === "function"
      ) {
        const t = currentTarget.translation();
        playerPos.current.set(t.x, t.y, t.z);
      } else if (
        "getWorldPosition" in currentTarget &&
        typeof currentTarget.getWorldPosition === "function"
      ) {
        currentTarget.getWorldPosition(playerPos.current);
      } else if ("position" in currentTarget) {
        playerPos.current.copy((currentTarget as THREE.Object3D).position);
      }
    } else {
      playerPos.current.copy(camera.position);
    }

    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uPlayerPos.value.copy(playerPos.current);
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, density]}
      frustumCulled={false}
      receiveShadow
    >
      <primitive object={material} ref={matRef} attach="material" />
    </instancedMesh>
  );
};

// ── NEW INDEPENDENT SNAPPING VERTEX SHADER ────────────────────────────────────
const grassVertexShader = /* glsl */ `
uniform float uTime;
uniform vec3 uPlayerPos;
uniform float uRadius;

attribute vec2 aInstanceOffset;

varying float vElevation;
varying vec3 vWorldPos;
varying float vAlpha;
varying vec3 vNormal;

float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
}

float getTerrainHeight(float x, float z) {
    return sin(x * 0.02) * cos(z * 0.02) * 0.2
         + sin(x * 0.15) * sin(z * 0.15) * 0.7;
}

void main() {
    vElevation = position.y;

    float range = uRadius * 2.0;

    // 1. Individual Relative Snapping Math: 
    // This moves each instance independently to form a seamless infinite coordinate layout.
    vec3 worldAnchor = vec3(0.0);
    worldAnchor.x = floor((uPlayerPos.x - aInstanceOffset.x) / range + 0.5) * range + aInstanceOffset.x;
    worldAnchor.z = floor((uPlayerPos.z - aInstanceOffset.y) / range + 0.5) * range + aInstanceOffset.y;

    // 2. Generate rock-solid variance hashes using the absolute finalized world layout
    float h = hash(worldAnchor.xz);
    worldAnchor.x += (h - 0.5) * 0.3;
    worldAnchor.z += (hash(worldAnchor.zx) - 0.5) * 0.3;
    
    // Snap cleanly onto your height maps
    worldAnchor.y = getTerrainHeight(worldAnchor.x, worldAnchor.z);

    // 3. Scale, rotation, and structural adjustments
    vec3 localPos = position;
    localPos.xyz *= vec3(0.85 + h * 0.45, 0.75 + h * 0.55, 0.85 + h * 0.45); 

    float angle = h * 6.283185; 
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);
    localPos.xz = rot * localPos.xz;

    // Multi-frequency wind layers
    float windTime = uTime * 2.2 + (worldAnchor.x + worldAnchor.z) * 0.12;
    float sway = sin(windTime) * 0.09 + cos(windTime * 1.7) * 0.04;
    float bendFactor = pow(vElevation, 1.4);
    localPos.x += sway * bendFactor;
    localPos.z += sway * 0.4 * bendFactor;

    vWorldPos = worldAnchor + localPos;

    // 4. Circle Culling Horizon Math
    float dist = distance(vec3(vWorldPos.x, 0.0, vWorldPos.z), vec3(uPlayerPos.x, 0.0, uPlayerPos.z));
    
    // Smoothly fade grass down into opacity right at the radius bounds
    vAlpha = 1.0 - smoothstep(uRadius * 0.85, uRadius, dist);

    if (vAlpha <= 0.0) {
        vWorldPos.y -= 9999.0; 
    }

    vNormal = normalize(vec3(-s, 0.1, c));
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
`;

const grassFragmentShader = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFogColor;
uniform vec3 uPlayerPos;

varying float vElevation;
varying vec3 vWorldPos;
varying float vAlpha;
varying vec3 vNormal;

void main() {
    if (vAlpha < 0.01) discard;

    float t = clamp(vElevation, 0.0, 1.0);
    vec3 rootColor = uBaseColor * 0.35; 
    vec3 baseColor = mix(rootColor, uBaseColor, smoothstep(0.0, 0.25, t));
    vec3 finalGrassColor = mix(baseColor, uTipColor, t);

    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    vec3 normal = gl_FrontFacing ? vNormal : -vNormal;
    
    float NdotL = dot(normal, lightDir) * 0.5 + 0.5;
    float celLight = smoothstep(0.35, 0.4, NdotL) * 0.55 + 0.45;

    vec3 finalColor = finalGrassColor * celLight;

    float cameraDist = length(cameraPosition - vWorldPos);
    float fogFactor = smoothstep(25.0, uPlayerPos.y + 70.0, cameraDist);
    finalColor = mix(finalColor, uFogColor, fogFactor * 0.85);

    gl_FragColor = vec4(finalColor, vAlpha);
}
`;
