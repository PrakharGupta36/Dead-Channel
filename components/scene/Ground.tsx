"use client";

import { GrassField } from "@/components/models/Grass";
import { shaderMaterial, useTexture } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { memo, useMemo } from "react";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Shader material (unchanged from original)
// ---------------------------------------------------------------------------
const GroundMaterial = shaderMaterial(
  {
    grassTexture: null,
    dirtTexture: null,
    dirtNormal: null,
    noiseScale: 140,
    patchiness: 0.55,
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
  uniform sampler2D grassTexture;
  uniform sampler2D dirtTexture;
  uniform sampler2D dirtNormal;
  uniform float noiseScale;
  uniform float patchiness;

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
    vec2 worldUv = vWorldPosition.xz / 30.0;
    vec3 grass   = texture2D(grassTexture, worldUv).rgb;
    vec3 dirt    = texture2D(dirtTexture,  worldUv).rgb;
    float n      = 0.5 + 0.5*simplex2d(vWorldPosition.xz / noiseScale);
    float blend  = smoothstep(patchiness-0.1, patchiness+0.1, n);
    vec3 baseColor = mix(grass, dirt, blend);
    vec3 lightDir  = normalize(vec3(1.0, 1.5, 0.5));
    float diffuse  = max(dot(normalize(vNormal), lightDir), 0.0);
    vec3 ambient   = baseColor * 0.4;
    vec3 lighting  = baseColor * diffuse * 0.8;
    gl_FragColor   = vec4(ambient + lighting, 1.0);
  }
  `,
);

extend({ GroundMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    groundMaterial: {
      grassTexture: THREE.Texture;
      dirtTexture: THREE.Texture;
      dirtNormal: THREE.Texture;
      noiseScale?: number;
      patchiness?: number;
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
  segments = 128,
  playerRef,
  children,
}: GroundProps) {
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

  // ---- trimesh arrays (extracted once from the same geometry) --------------
  // TrimeshCollider from @react-three/rapier expects:
  //   vertices : Float32Array  (flat x,y,z per vertex)
  //   indices  : Uint32Array   (triangle indices)
  const { trimeshVertices, trimeshIndices } = useMemo(() => {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;

    // vertices: plain Float32Array copy
    const trimeshVertices = new Float32Array(posAttr.array);

    // indices: PlaneGeometry always generates an indexed buffer
    const idx = geometry.index!;
    const trimeshIndices = new Uint32Array(idx.count);
    for (let i = 0; i < idx.count; i++) {
      trimeshIndices[i] = idx.getX(i);
    }

    return { trimeshVertices, trimeshIndices };
  }, [geometry]);

  // ---- textures -----------------------------------------------------------
  const [grassTexture, dirtTexture, dirtNormal] = useTexture([
    "/textures/ground/grass.jpg",
    "/textures/ground/dirt_color.jpg",
    "/textures/ground/dirt_normal.jpg",
  ]);

  useMemo(() => {
    [grassTexture, dirtTexture, dirtNormal].forEach((tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 32;
    });
  }, [grassTexture, dirtTexture, dirtNormal]);

  // ---- fall-through guard --------------------------------------------------
  useFrame(() => {
    if (!playerRef.current) return;
    if (playerRef.current.position.y < -15) {
      playerRef.current.position.set(0, getTerrainHeight(0, 0) + 2, 0);
    }
  });

  return (
    <>
      {/* ---- physics body with trimesh that matches real geometry ---- */}
      <RigidBody type="fixed" colliders={false}>
        <mesh geometry={geometry} receiveShadow>
          <groundMaterial
            grassTexture={grassTexture}
            dirtTexture={dirtTexture}
            dirtNormal={dirtNormal}
            noiseScale={140}
            patchiness={0.55}
          />
        </mesh>

        <TrimeshCollider args={[trimeshVertices, trimeshIndices]} />
      </RigidBody>

      <GrassField  />

      {children}
    </>
  );
});

export default Ground;
