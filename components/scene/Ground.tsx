"use client";

import { shaderMaterial, useTexture } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  TrimeshCollider,
} from "@react-three/rapier";
import { memo, useMemo } from "react";
import * as THREE from "three";
import { GrassField } from "../models/Grass";

// ---------------------------------------------------------------------------
// Shader material — stylized toon ground, now texture-driven
// ---------------------------------------------------------------------------
const GroundMaterial = shaderMaterial(
  {
    noiseScale: 140,
    patchiness: 0.55,
    bandSteps: 3,
    textureScale: 9, // world units per texture tile
    grassMap: null,
    dirtMap: null,
    dirtNormalMap: null,
  },

  /* vertex */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
  `,

  /* fragment */ `
  uniform float noiseScale;
  uniform float patchiness;
  uniform float bandSteps;
  uniform float textureScale;
  uniform sampler2D grassMap;
  uniform sampler2D dirtMap;
  uniform sampler2D dirtNormalMap;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  vec3 mod289(vec3 x) { return x - floor(x*(1./289.))*289.; }
  vec2 mod289(vec2 x) { return x - floor(x*(1./289.))*289.; }
  vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }

  float simplex2d(vec2 v) {
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = x0.x > x0.y ? vec2(1.,0.) : vec2(0.,1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
    vec3 m = max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m*=m; m*=m;
    vec3 x = 2.*fract(p*C.www)-1.;
    vec3 h = abs(x)-.5;
    vec3 ox = floor(x+.5);
    vec3 a0 = x-ox;
    m *= 1.79284291400159-.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x  = a0.x*x0.x  + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.*dot(m,g);
  }

  void main() {
    vec2 tileUv = vWorldPosition.xz / textureScale;

    vec3 grassColor = texture2D(grassMap, tileUv).rgb;
    vec3 dirtColor  = texture2D(dirtMap, tileUv).rgb;
    vec3 dirtNrm    = texture2D(dirtNormalMap, tileUv).rgb * 2.0 - 1.0;

    // large-scale patchiness between grass and dirt textures
    float n1    = 0.5 + 0.5*simplex2d(vWorldPosition.xz / noiseScale);
    float blend = smoothstep(patchiness-0.15, patchiness+0.15, n1);
    vec3 baseColor = mix(grassColor, dirtColor, blend);

    // small-scale mottling so it doesn't read as a flat fill
    float n2 = simplex2d(vWorldPosition.xz * 0.35);
    baseColor += n2 * 0.03;

    // perturb normal only where dirt shows through (ground is ~flat,
    // so world axes double as a cheap tangent basis — no tangent attrs needed)
    vec3 tangent   = vec3(1.0, 0.0, 0.0);
    vec3 bitangent = vec3(0.0, 0.0, 1.0);
    vec3 bumpedNormal = normalize(
      tangent * dirtNrm.x + bitangent * dirtNrm.y + vNormal * dirtNrm.z
    );
    vec3 finalNormal = normalize(mix(vNormal, bumpedNormal, blend * 0.6));

    // toon / cel-shaded lighting — banded instead of smooth gradient
    vec3 lightDir = normalize(vec3(1.0, 1.5, 0.5));
    float diffuse = max(dot(finalNormal, lightDir), 0.0);
    float banded  = floor(diffuse * bandSteps) / bandSteps;

    vec3 ambient  = baseColor * 0.55;
    vec3 lighting = baseColor * (0.45 + banded * 0.55);

    gl_FragColor = vec4(ambient * 0.4 + lighting * 0.6, 1.0);
  }
  `,
);

extend({ GroundMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    groundMaterial: {
      noiseScale?: number;
      patchiness?: number;
      bandSteps?: number;
      textureScale?: number;
      grassMap?: THREE.Texture | null;
      dirtMap?: THREE.Texture | null;
      dirtNormalMap?: THREE.Texture | null;
    };
  }
}

// ---------------------------------------------------------------------------
// Terrain height function – single source of truth used by Ground, physics
// collider, and Grass blade placement.
// ---------------------------------------------------------------------------
export function getTerrainHeight(x: number, z: number): number {
  return (
    Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.0 +
    Math.sin(x * 0.15) * Math.sin(z * 0.15) * 0.0
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GroundProps {
  size?: number;
  segments?: number;
  playerRef: React.RefObject<THREE.Group | null>;
  children?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
const Ground = memo(function Ground({
  size = 300,
  segments = 48, // was 128 — flat ground doesn't need dense tessellation for shape,
  // texture/normal-map detail carries the visual richness instead
  playerRef,
  children,
}: GroundProps) {
  // ---- textures --------------------------------------------------------
  const [grassMap, dirtMap, dirtNormalMap] = useTexture([
    "/textures/ground/grass.jpg",
    "/textures/ground/dirt_color.jpg",
    "/textures/ground/dirt_normal.jpg",
  ]);

  useMemo(() => {
    [grassMap, dirtMap, dirtNormalMap].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      // Modest anisotropy — visual quality at grazing angles without the
      // GPU cost of maxing it out on every sample.
      tex.anisotropy = 4;
    });
    grassMap.colorSpace = THREE.SRGBColorSpace;
    dirtMap.colorSpace = THREE.SRGBColorSpace;
    // normal maps stay linear — no colorSpace assignment
  }, [grassMap, dirtMap, dirtNormalMap]);

  // ---- geometry (visual + physics share the same computed positions) -------
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }

    geo.computeVertexNormals();
    return geo;
  }, [size, segments]);

  // ---- collider strategy: skip trimesh entirely when the terrain is flat ---
  // Building + simulating a trimesh against a perfectly flat surface is wasted
  // broadphase/narrowphase work. Detect real height variation and only pay
  // for a trimesh when the terrain actually needs it.
  const { isFlat, trimeshVertices, trimeshIndices } = useMemo(() => {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;

    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const flat = maxY - minY < 1e-4;

    if (flat) {
      return { isFlat: true, trimeshVertices: null, trimeshIndices: null };
    }

    const trimeshVertices = new Float32Array(posAttr.array);
    const idx = geometry.index!;
    const trimeshIndices = new Uint32Array(idx.count);
    for (let i = 0; i < idx.count; i++) {
      trimeshIndices[i] = idx.getX(i);
    }

    return { isFlat: false, trimeshVertices, trimeshIndices };
  }, [geometry]);

  // ---- fall-through guard --------------------------------------------------
  useFrame(() => {
    if (!playerRef.current) return;
    if (playerRef.current.position.y < -15) {
      playerRef.current.position.set(0, getTerrainHeight(0, 0) + 2, 0);
    }
  });

  return (
    <>
      {/* ---- physics body: cheap cuboid when flat, trimesh only when needed ---- */}
      <RigidBody type="fixed" colliders={false}>
        <mesh geometry={geometry} receiveShadow>
          <groundMaterial
            noiseScale={140}
            patchiness={0.55}
            bandSteps={3}
            textureScale={9}
            grassMap={grassMap}
            dirtMap={dirtMap}
            dirtNormalMap={dirtNormalMap}
          />
        </mesh>

        {isFlat ? (
          <CuboidCollider
            args={[size / 2, 0.05, size / 2]}
            position={[0, -0.05, 0]}
          />
        ) : (
          <TrimeshCollider args={[trimeshVertices!, trimeshIndices!]} />
        )}
      </RigidBody>

      {/* <Foliage size={size} /> */}
      <GrassField />

      {children}
    </>
  );
});

export default Ground;
