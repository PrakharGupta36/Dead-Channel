export const grassVertexShader = `
attribute vec3 offset;
attribute float height;
attribute float randomSeed;

uniform float uTime;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform vec3 uInteractionPoint;
uniform float uInteractionRadius;
uniform float uInteractionStrength;

uniform vec3 uPlayerPosition;
uniform float uVisibleRadius;

varying vec3 vPosition;
varying float vHeight;
varying float vColorNoise;
varying float vLightModifier; // Sent downstream to create gorgeous lighting shadows

void main() {
  vec3 pos = position;
  float heightInfluence = pos.y; 

  // --- 1. CIRCLE RADIUS CULLING MATH ---
  float distToPlayer = distance(offset.xz, uPlayerPosition.xz);
  // Softened the edge slightly (featherZone 3.0) so blades grow smoothly out of the ground
  float featherZone = 2.0; 
  float visibility = 1.0 - smoothstep(uVisibleRadius - featherZone, uVisibleRadius, distToPlayer);

  // --- 2. ULTRA-THIN BLADE SHAPING & LEANING ---
  // Taper width to absolute 0 at the tip
  pos.x *= (1.0 - heightInfluence) * 0.15 * visibility;
  pos.y *= height * visibility;

  // PREMIUM VISUAL ADDITION: Give each thin blade a permanent organic bend and lean direction
  // This turns rigid straight vertical sticks into soft, realistic flowing grass.
  float randomAngle = randomSeed * 6.2831;
  vec2 leanDirection = vec2(sin(randomAngle), cos(randomAngle));
  
  // Curved gravity bend: More lean at the tip, zero at the root
  float curveFactor = heightInfluence * heightInfluence * 0.18; 
  pos.xz += leanDirection * curveFactor;

  // --- 3. WIND ANIMATION ---
  // Layered sine wave waves to simulate micro-turbulence on thin strands
  float windWave = sin((uTime * uWindSpeed) + (randomSeed * 6.2831)) * uWindStrength;
  pos.x += windWave * heightInfluence;
  pos.z += sin((uTime * uWindSpeed * 0.7) + (randomSeed * 3.1415)) * uWindStrength * heightInfluence * 0.4;
  
  // --- 4. PLAYER INTERACTION ---
  vec3 worldPos = pos + offset;
  float distanceToInteraction = distance(worldPos, uInteractionPoint);
  if (distanceToInteraction < uInteractionRadius) {
    float influence = 1.0 - (distanceToInteraction / uInteractionRadius);
    influence = influence * influence;
    vec3 directionFromInteraction = normalize(worldPos - uInteractionPoint);
    directionFromInteraction.y = -0.1;
    pos += directionFromInteraction * influence * uInteractionStrength * heightInfluence;
  }
  
  // --- 5. FINALIZE POSITION & SHADING LOGIC ---
  pos += offset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  
  // Pass metrics to the fragment shader
  vPosition = pos;
  vHeight = heightInfluence;
  
  // Performance Noise: Multiplied slightly higher to give individual blades organic hue variance
  vColorNoise = fract(sin(randomSeed * 43758.5453)) * 0.05 - 0.025;

  // Fake Ambient Occlusion Factor: Ground roots are deeply shadowed, tips are brilliantly illuminated
  // We bake a subtle randomized light bounce directly into the vertex pass to save fragment cycles!
  vLightModifier = mix(0.4, 1.1, heightInfluence) + (randomSeed * 0.1 - 0.05);
}
`;