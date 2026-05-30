"use client";

import { Cloud, Clouds, Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  ChromaticAberration,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef } from "react";
import * as THREE from "three";

// Postprocessing is a separate component so it only re-renders when its own
// props change — not on every Environment useFrame tick.
function PostProcessing() {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SMAA />

      <Vignette
        offset={0.5}
        darkness={0.6}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={[0.0007, 0.0007]}
        radialModulation
        modulationOffset={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

export default function Environment() {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  // Only animate the sun intensity — one ref, one sin per frame
  useFrame(({ clock }) => {
    if (sunRef.current) {
      sunRef.current.intensity = 2.0 + Math.sin(clock.elapsedTime * 0.3) * 0.06;
    }
  });

  return (
    <>
      {/* ── SKY ─────────────────────────────────────────────────────────────── */}
      <Sky
        distance={450000}
        sunPosition={[0, 0.18, -0.5]}
        rayleigh={0.8}
        turbidity={6}
        mieCoefficient={0.004}
        mieDirectionalG={0.88}
        inclination={0.505}
        azimuth={0.28}
      />

      {/* ── CLOUDS ──────────────────────────────────────────────────────────── */}
      {/* limit=600 allows more total segments; range=300 spreads them wider.   */}
      {/* Reduced per-cloud segments vs before — more clouds, same GPU budget.  */}
      <Clouds material={THREE.MeshLambertMaterial} limit={600} range={300}>
        {/* Near layer — large, prominent */}
        <Cloud
          seed={1}
          scale={4.0}
          position={[-60, 58, -110]}
          volume={16}
          color="#f0f4ff"
          fade={70}
          opacity={0.6}
          speed={0.07}
          segments={18}
        />
        <Cloud
          seed={4}
          scale={3.2}
          position={[85, 62, -130]}
          volume={12}
          color="#e8f0ff"
          fade={85}
          opacity={0.5}
          speed={0.05}
          segments={16}
        />
        <Cloud
          seed={7}
          scale={4.8}
          position={[35, 50, -90]}
          volume={10}
          color="#eef4ff"
          fade={55}
          opacity={0.4}
          speed={0.06}
          segments={14}
        />
        {/* Mid layer — spread further back */}
        <Cloud
          seed={12}
          scale={2.5}
          position={[-130, 64, -170]}
          volume={8}
          color="#f2f6ff"
          fade={100}
          opacity={0.35}
          speed={0.04}
          segments={12}
        />
        <Cloud
          seed={19}
          scale={3.8}
          position={[110, 55, -180]}
          volume={14}
          color="#e4eeff"
          fade={90}
          opacity={0.45}
          speed={0.05}
          segments={14}
        />
        <Cloud
          seed={23}
          scale={2.2}
          position={[-40, 70, -200]}
          volume={6}
          color="#f5f8ff"
          fade={110}
          opacity={0.3}
          speed={0.03}
          segments={10}
        />
        {/* Far layer — distant wisps */}
        <Cloud
          seed={31}
          scale={5.0}
          position={[60, 72, -250]}
          volume={18}
          color="#edf3ff"
          fade={130}
          opacity={0.25}
          speed={0.03}
          segments={10}
        />
        <Cloud
          seed={37}
          scale={3.0}
          position={[-90, 68, -230]}
          volume={8}
          color="#f0f5ff"
          fade={120}
          opacity={0.2}
          speed={0.02}
          segments={8}
        />
        <Cloud
          seed={41}
          scale={2.8}
          position={[140, 60, -210]}
          volume={7}
          color="#e8f2ff"
          fade={115}
          opacity={0.28}
          speed={0.04}
          segments={8}
        />
      </Clouds>

      {/* ── FOG ─────────────────────────────────────────────────────────────── */}
      {/* near=30 (was 45): starts sooner                                       */}
      {/* far=80 (was 105): hits full density closer — denser feel              */}
      {/* color #a0bcc4: matches Sky horizon, slightly warmer than before       */}
      <fog attach="fog" args={["#a0bcc4", 30, 80]} />

      {/* ── LIGHTS ──────────────────────────────────────────────────────────── */}

      {/* Hemisphere: NEUTRAL white sky, dark olive ground.                     */}
      {/* Previously #a8c4e0 sky was strongly blue — that's what tinted         */}
      {/* every object. Pure white sky = objects keep their natural colors.     */}
      <hemisphereLight args={["#ffffff", "#2a3d18", 0.7]} />

      {/* Ambient: pure white, low. No color cast.                              */}
      <ambientLight intensity={0.9} />

      {/* Key sun: warm golden, matches Sky sun disc position.                  */}
      {/* shadow-mapSize 1024 (was 2048) — halves shadow VRAM, still sharp.    */}
      <directionalLight
        ref={sunRef}
        castShadow
        intensity={2.0}
        position={[-40, 45, -25]}
        color="#ffe9a8"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />

      {/* Rim: very subtle cool blue — just enough to separate silhouettes.     */}
      {/* Intensity 0.18 (was 0.28) so it doesn't compete with the sun.        */}
      <directionalLight
        intensity={0.18}
        position={[45, 30, 35]}
        color="#9ac4e0"
      />

      {/* Spooky ground mist: cold point at y=0, no shadows, short range.      */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={1.0}
        distance={15}
        decay={2.5}
        color="#2a4858"
      />

      <PostProcessing />
    </>
  );
}
