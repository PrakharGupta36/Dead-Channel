import Ecctrl from "ecctrl";

export default function Player() {
  return (
    <Ecctrl
      animated
      camCollision
      maxVelLimit={6}
      jumpVel={5}
      position={[0, 1, 0]}
      camInitDis={-5}
      camMaxDis={-10}
      turnVelMultiplier={1}
    >
      <mesh castShadow>
        <capsuleGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Ecctrl>
  );
}
