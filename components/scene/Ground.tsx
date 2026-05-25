import { RigidBody } from "@react-three/rapier";

export default function Ground() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow rotation-x={-Math.PI} position={[0, 0.6, 0]}>
        <boxGeometry args={[200, 0.2, 200]} />
        <meshStandardMaterial color="#20ff30" />
      </mesh>
    </RigidBody>
  );
}