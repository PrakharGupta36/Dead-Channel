function mod289(x: number): number {
  return x - Math.floor(x * (1.0 / 289.0)) * 289.0;
}
function permute(x: number): number {
  return mod289((x * 34.0 + 1.0) * x);
}

export function simplex2d(px: number, pz: number): number {
  const C0 = 0.211324865405187;
  const C1 = 0.366025403784439;
  const C2 = -0.577350269189626;
  const C3 = 0.024390243902439;

  const dot = px * C1 + pz * C1;
  const ix = Math.floor(px + dot);
  const iz = Math.floor(pz + dot);

  const dot2 = ix * C0 + iz * C0;
  const x0x = px - ix + dot2;
  const x0z = pz - iz + dot2;

  const i1x = x0x > x0z ? 1.0 : 0.0;
  const i1z = x0x > x0z ? 0.0 : 1.0;

  const x12x = x0x + C0 - i1x;
  const x12z = x0z + C0 - i1z;
  const x12w = x0x + C2;
  const x12y = x0z + C2; // actually z component

  const ii = mod289(ix);
  const jj = mod289(iz);

  const p0 = permute(permute(jj + 0.0) + ii + 0.0);
  const p1 = permute(permute(jj + i1z) + ii + i1x);
  const p2 = permute(permute(jj + 1.0) + ii + 1.0);

  const m0 = Math.max(0.5 - (x0x * x0x + x0z * x0z), 0.0);
  const m1 = Math.max(0.5 - (x12x * x12x + x12z * x12z), 0.0);
  const m2 = Math.max(0.5 - (x12w * x12w + x12y * x12y), 0.0);

  const m0q = m0 * m0 * m0 * m0;
  const m1q = m1 * m1 * m1 * m1;
  const m2q = m2 * m2 * m2 * m2;

  const gx0 = 2.0 * ((p0 * C3) % 1.0) - 1.0;
  const gx1 = 2.0 * ((p1 * C3) % 1.0) - 1.0;
  const gx2 = 2.0 * ((p2 * C3) % 1.0) - 1.0;

  const gh0 = Math.abs(gx0) - 0.5;
  const gh1 = Math.abs(gx1) - 0.5;
  const gh2 = Math.abs(gx2) - 0.5;

  const ox0 = Math.floor(gx0 + 0.5);
  const ox1 = Math.floor(gx1 + 0.5);
  const ox2 = Math.floor(gx2 + 0.5);

  const a0_0 = gx0 - ox0;
  const a0_1 = gx1 - ox1;
  const a0_2 = gx2 - ox2;

  const norm0 = 1.79284291400159 - 0.85373472095314 * (a0_0 * a0_0 + gh0 * gh0);
  const norm1 = 1.79284291400159 - 0.85373472095314 * (a0_1 * a0_1 + gh1 * gh1);
  const norm2 = 1.79284291400159 - 0.85373472095314 * (a0_2 * a0_2 + gh2 * gh2);

  const g0 = (a0_0 * x0x + gh0 * x0z) * norm0;
  const g1 = (a0_1 * x12x + gh1 * x12z) * norm1;
  const g2 = (a0_2 * x12w + gh2 * x12y) * norm2;

  return 130.0 * (m0q * g0 + m1q * g1 + m2q * g2);
}

// ---------------------------------------------------------------------------
// GLSL wind shader snippet injected via onBeforeCompile
// ---------------------------------------------------------------------------