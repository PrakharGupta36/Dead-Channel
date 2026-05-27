"use client";

export default function Environment() {
  return (
    <>
      <color attach="background" args={["#a9cbe2"]} />

      <fogExp2 attach="fog" args={["#a9cbe2", 0.03]} />

      <ambientLight intensity={0.4} />

      <directionalLight
        castShadow
        intensity={1.4}
        position={[50, 70, 40]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={250}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-bias={-0.0004}
      />

    </>
  );
}
