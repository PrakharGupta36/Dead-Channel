export const grassFragmentShader = `
precision mediump float;

varying vec3 vPosition;
varying float vHeight;
varying float vColorNoise;

uniform vec3 uGrassColor;
uniform vec3 uGrassColorTip;

void main() {
  // Base gradient
  vec3 color = mix(uGrassColor, uGrassColorTip, vHeight);

  // Soft shading down the blade
  color *= (vHeight * 0.15 + 0.85);

  // Subtle variation
  color += vColorNoise;

  // Clamp to prevent HDR values
  // Keeps grass completely excluded from bloom
  color = clamp(color, 0.0, 0.95);

  gl_FragColor = vec4(color, 1.0);
}
`;