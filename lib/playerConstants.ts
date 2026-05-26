import * as THREE from "three";

export const COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#ffe66d",
  "#a29bfe",
  "#feca57",
  "#48dbfb",
];

export const SPAWN_Y = 2;
export const SPAWN_RADIUS = 36;

export const SPAWN_POSITIONS: [number, number, number][] = [
  [SPAWN_RADIUS, SPAWN_Y, SPAWN_RADIUS],
  [-SPAWN_RADIUS, SPAWN_Y, SPAWN_RADIUS],
  [SPAWN_RADIUS, SPAWN_Y, -SPAWN_RADIUS],
  [-SPAWN_RADIUS, SPAWN_Y, -SPAWN_RADIUS],
  [SPAWN_RADIUS * 1.8, SPAWN_Y, 0],
  [-SPAWN_RADIUS * 1.8, SPAWN_Y, 0],
  [0, SPAWN_Y, SPAWN_RADIUS * 1.8],
  [0, SPAWN_Y, -SPAWN_RADIUS * 1.8],
];

export const WALK_SPEED = 8;
export const RUN_SPEED = 14;
export const JUMP_VEL = 10;

export const CAM_DIST = 8;
export const CAM_HEIGHT = 1.2;

export const NET_SYNC_INTERVAL_MS = 80;

// Reusable scratch vectors — never expose these to concurrent callers
export const _moveDir = new THREE.Vector3();
export const _camFwd = new THREE.Vector3();
export const _camRight = new THREE.Vector3();
export const _up = new THREE.Vector3(0, 1, 0);
export const _camPos = new THREE.Vector3();
export const _lookAt = new THREE.Vector3();
export const _remoteTarget = new THREE.Vector3();
export const _remoteCurrent = new THREE.Vector3();
