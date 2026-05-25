/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";

import { RigidBody, RapierRigidBody } from "@react-three/rapier";

import { useAnimations, useGLTF } from "@react-three/drei";

import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

import { AnimationAction, LoopOnce } from "three";

type GLTFResult = {
  nodes: any;
  materials: any;
  animations: any[];
};

export default function Player() {
  const body = useRef<RapierRigidBody | null>(null);

  const group = useRef<THREE.Group>(null);

  const { camera } = useThree();

  // LOAD MODEL
  const { nodes, materials, animations } = useGLTF(
    "/Playable.glb",
  ) as unknown as GLTFResult;

  // ANIMATIONS
  const { actions } = useAnimations(animations, group);

  const shootAction = useRef<AnimationAction | null>(null);

  // INPUTS
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
  });

  // ROTATION TARGET
  const rotationTarget = useRef(0);

  // SETUP CONTROLS
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
      }
    };

    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
      }
    };

    const mouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      if (!shootAction.current) return;

      const action = shootAction.current;

      action.paused = false;

      action.reset();

      action.play();
    };

    window.addEventListener("keydown", down);

    window.addEventListener("keyup", up);

    window.addEventListener("mousedown", mouseDown);

    return () => {
      window.removeEventListener("keydown", down);

      window.removeEventListener("keyup", up);

      window.removeEventListener("mousedown", mouseDown);
    };
  }, []);

  // SETUP ANIMATION
  useEffect(() => {
    if (!actions) return;

    const firstAction = Object.values(actions)[0];

    if (!firstAction) return;

    shootAction.current = firstAction;

    firstAction.setLoop(LoopOnce, 1);

    firstAction.clampWhenFinished = true;

    firstAction.enabled = true;

    firstAction.paused = true;
  }, [actions]);

  // GAME LOOP
  useFrame((_, delta) => {
    if (!body.current || !group.current) return;

    const speed = 6;

    let moveX = 0;
    let moveZ = 0;

    // MOVEMENT
    if (keys.current.w) moveZ -= speed;

    if (keys.current.s) moveZ += speed;

    if (keys.current.a) moveX -= speed;

    if (keys.current.d) moveX += speed;

    body.current.setLinvel(
      {
        x: moveX,
        y: body.current.linvel().y,
        z: moveZ,
      },
      true,
    );

    // ROTATION
    if (moveX !== 0 || moveZ !== 0) {
      rotationTarget.current = Math.atan2(moveX, moveZ);

      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        rotationTarget.current,
        8 * delta,
      );
    }

    // PLAYER POSITION
    const pos = body.current.translation();

    // CAMERA FOLLOW
    const cameraOffset = new THREE.Vector3(0, 5, 10);

    const cameraPosition = new THREE.Vector3(pos.x, pos.y, pos.z).add(
      cameraOffset,
    );

    camera.position.lerp(cameraPosition, 4 * delta);

    camera.lookAt(pos.x, pos.y + 2, pos.z);
  });

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      mass={1}
      position={[0, 2, 0]}
      enabledRotations={[false, false, false]}
    >
      <group ref={group} scale={1.5}>
        <group name="Sketchfab_Scene">
          <group
            name="Sketchfab_model"
            position={[-0.04, 0, -0.271]}
            rotation={[-Math.PI / 2, 0, -3.141]}
          >
            <group
              name="cdb1292dcd4c44a1b5947c8babee1d36fbx"
              rotation={[Math.PI / 2, 0, 0]}
            >
              <group name="Object_2">
                <group name="RootNode">
                  <group name="Armature" rotation={[Math.PI, 0, Math.PI]}>
                    <group name="Object_5">
                      <primitive object={nodes._rootJoint} />

                      <skinnedMesh
                        name="Object_62"
                        geometry={nodes.Object_62.geometry}
                        material={materials.lambert1}
                        skeleton={nodes.Object_62.skeleton}
                      />

                      <skinnedMesh
                        name="Object_64"
                        geometry={nodes.Object_64.geometry}
                        material={materials.STR_Weaponlambert2}
                        skeleton={nodes.Object_64.skeleton}
                      />

                      <group
                        name="Object_61"
                        rotation={[Math.PI, 0, Math.PI]}
                      />

                      <group
                        name="Object_63"
                        rotation={[Math.PI, 0, -Math.PI]}
                      />
                    </group>
                  </group>

                  <group
                    name="Stormtrooper"
                    rotation={[Math.PI, 0, -Math.PI]}
                  />

                  <group
                    name="STR_Weaponblaster"
                    rotation={[Math.PI, 0, Math.PI]}
                  />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </RigidBody>
  );
}

useGLTF.preload("/Playable.glb");
