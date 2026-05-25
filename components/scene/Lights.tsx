export default function Lights() {
  return (
    <>
      {/* ambient fill */}
      <ambientLight intensity={0.35} />

      {/* main sun light */}
      <directionalLight
        castShadow
        intensity={1.8}
        position={[25, 35, 15]}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />

      {/* soft blue environment bounce */}
      <hemisphereLight intensity={0.5} groundColor="#1a1a1a" color="#87ceeb" />

      {/* subtle player rim light */}
      <pointLight position={[-10, 8, -10]} intensity={15} distance={50} />
    </>
  );
}
