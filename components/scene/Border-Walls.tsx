"use client";

import { RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BorderWallsProps {
  size?: number;
  segments?: number;
}

// Vertex Shader: Unchanged, handles depth mapping and fog chunk calculations
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;

  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vHeight = position.y;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

// Fragment Shader: High-frequency digital matrix layout + scene fog integration
const fragmentShader = `
  uniform float uTime;
  uniform float uHeight;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vHeight;

  #include <fog_pars_fragment>

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0;
    return mix(mix(hash(n+0.0), hash(n+1.0), f.x), mix(hash(n+57.0), hash(n+58.0), f.x), f.y);
  }

  void main() {
    // ── 1. GLITCH & DISTORTION ─────────────────────────────────────────────
    vec2 uv = vUv;
    float glitchTime = uTime * 0.5;
    float glitchStrength = step(0.96, sin(glitchTime * 2.0) * cos(glitchTime * 5.0)) * 0.012;
    float lineNoise = noise(vec2(uv.y * 40.0, uTime * 10.0));
    uv.x += lineNoise * glitchStrength;

    // ── 2. CHROMATIC ABERRATION ────────────────────────────────────────────
    float shift = 0.007 + sin(uTime * 2.0) * 0.002;
    vec2 center1 = vec2(0.5 + sin(uTime * 0.2) * 0.1, 0.45 + cos(uTime * 0.15) * 0.08);
    vec2 center2 = vec2(0.35 + cos(uTime * 0.25) * 0.12, 0.6 + sin(uTime * 0.18) * 0.1);
    
    float rRings = sin(length((uv + vec2(shift, 0.0)) - center1) * 45.0 - uTime * 2.5) * 0.5 + sin(length((uv + vec2(shift, 0.0)) - center2) * 32.0 + uTime * 1.8) * 0.3;
    float gRings = sin(length(uv - center1) * 45.0 - uTime * 2.5) * 0.5 + sin(length(uv - center2) * 32.0 + uTime * 1.8) * 0.3;
    float bRings = sin(length((uv - vec2(shift, 0.0)) - center1) * 45.0 - uTime * 2.5) * 0.5 + sin(length((uv - vec2(shift, 0.0)) - center2) * 32.0 + uTime * 1.8) * 0.3;

    // ── 3. ENVIRONMENT TINT BALANCING ──────────────────────────────────────
    vec3 baseTeal    = vec3(0.1, 0.55, 0.75); 
    vec3 baseMagenta = vec3(0.65, 0.15, 0.75);
    vec3 baseCyan    = vec3(0.2, 0.8, 0.95);

    // Moiré grid density mapped over the dome curvature
    vec2 gridParam = uv * vec2(320.0, 160.0);
    float gridPattern = clamp(sin(gridParam.x) * sin(gridParam.y) * 4.0, 0.0, 1.0);
    
    float beam = fract(uv.y * 1.5 - uTime * 0.3);
    float beamMask = smoothstep(0.85, 0.95, beam) + smoothstep(0.15, 0.0, beam);
    float beamLines = step(0.92, fract(uv.y * 40.0 - uTime * 1.5)) * 0.4;

    // Fresnel glow looking crisp on spherical hulls
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.5);

    float rFinalPattern = clamp(0.4 + rRings * 0.6 + beamMask * 0.3 + beamLines, 0.0, 1.0);
    float gFinalPattern = clamp(0.4 + gRings * 0.6 + beamMask * 0.2, 0.0, 1.0);
    float bFinalPattern = clamp(0.4 + bRings * 0.6 + beamMask * 0.4 + beamLines * 0.5, 0.0, 1.0);

    vec3 finalColor = vec3(
      mix(baseMagenta.r, baseCyan.r, rFinalPattern),
      mix(baseTeal.g, baseCyan.g, gFinalPattern),
      mix(baseTeal.b, baseMagenta.b, bFinalPattern)
    );

    finalColor = mix(finalColor * 0.35, finalColor, gridPattern);
    finalColor += vec3(0.4, 0.8, 1.0) * pow(fresnel, 4.0) * 1.5;

    // Opacity adjustments: Soft fade out right at the ground lip
    float verticalFade = smoothstep(0.0, 0.08, uv.y);
    float ringAlphaTotal = (rRings + gRings + bRings) / 3.0;
    float alpha = mix(0.45, 0.80, clamp(ringAlphaTotal * 0.5 + fresnel * 0.6 + beamMask * 0.2, 0.0, 1.0));
    alpha *= verticalFade;

    gl_FragColor = vec4(finalColor, alpha);
    #include <fog_fragment>
  }
`;

export default function BorderWalls({
  size = 150,
  segments = 64,
}: BorderWallsProps) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const domeGeometry = useMemo(() => {
    const radius = size / 2;

    // Sphere parameters: radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength
    // Setting thetaLength to Math.PI / 2 creates a perfect top-half dome hemisphere
    const geometry = new THREE.SphereGeometry(
      radius,
      segments,
      Math.floor(segments / 2),
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );

    return geometry;
  }, [size, segments]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib["fog"],
          {
            uTime: { value: 0 },
            uHeight: { value: 25 },
          },
        ]),
        fog: true,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  );

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={domeGeometry}>
        <primitive object={shaderMaterial} ref={shaderRef} attach="material" />
      </mesh>
    </RigidBody>
  );
}
