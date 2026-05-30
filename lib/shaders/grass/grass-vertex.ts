export const grassVertexShader = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uHalfWidth;
uniform vec2  uFrequency;
uniform mat4  uViewMatrix;
uniform mat4  uProjectionMatrix;

// Interaction
uniform vec3  uInteractionPoint;
uniform float uInteractionRadius;
uniform float uInteractionStrength;

// Circle fade
uniform vec3  uPlayerPosition;
uniform float uVisibleRadius;
uniform float uFadeWidth;

// LOD / smooth reveal
uniform float uLodInner;   // inner radius for this LOD band
uniform float uLodOuter;   // outer radius for this LOD band
uniform float uRevealSeed; // changes each rebuild so blades fade-in staggered

varying float vElevation;
varying float vSideGradient;
varying vec3  vNormal;
varying vec3  vFakeNormal;   // blade-outward normal (for lighting)
varying vec3  vPosition;
varying float vColorNoise;
varying float vAlpha;
varying vec3  vViewDir;      // view direction for rim/SSS

// ── Helpers ──────────────────────────────────────────────────────────────────
float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float bezier(float t, float p1) {
    float invT = 1.0 - t;
    return invT * invT * 0.0 + 2.0 * invT * t * p1 + t * t * 1.0;
}

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec2 fade(vec2 t)     { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec2 P) {
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod(Pi, 289.0);
    vec4 ix = Pi.xzxz; vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz; vec4 fy = Pf.yyww;
    vec4 i  = permute(permute(ix) + iy);
    vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
    vec4 gy = abs(gx) - 0.5;
    gx = gx - floor(gx + 0.5);
    vec2 g00 = vec2(gx.x, gy.x); vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z); vec2 g11 = vec2(gx.w, gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 *
        vec4(dot(g00,g00), dot(g01,g01), dot(g10,g10), dot(g11,g11));
    g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    return 2.3 * mix(n_x.x, n_x.y, fade_xy.y);
}

float getTerrainHeight(float x, float z) {
    return sin(x * 0.02) * cos(z * 0.02) * 0.2
         + sin(x * 0.15) * sin(z * 0.15) * 0.7;
}

vec3 getTerrainNormal(float x, float z) {
    float eps = 0.1;
    float hL = getTerrainHeight(x - eps, z);
    float hR = getTerrainHeight(x + eps, z);
    float hD = getTerrainHeight(x, z - eps);
    float hU = getTerrainHeight(x, z + eps);
    return normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
}

vec3 rotateAround(vec3 v, vec3 k, float angle) {
    float c = cos(angle); float s = sin(angle);
    return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

// ── Main ─────────────────────────────────────────────────────────────────────
void main() {
    vec3 instancePos = vec3(
        instanceMatrix[3].x,
        instanceMatrix[3].y,
        instanceMatrix[3].z
    );

    // ── Terrain ──────────────────────────────────────────────────────────────
    float terrainY     = getTerrainHeight(instancePos.x, instancePos.z);
    vec3  terrainNormal = getTerrainNormal(instancePos.x, instancePos.z);

    vec3  worldUp    = vec3(0.0, 1.0, 0.0);
    vec3  rotAxis    = cross(worldUp, terrainNormal);
    float rotAxisLen = length(rotAxis);
    float tiltAngle  = 0.0;
    if (rotAxisLen > 0.001) {
        rotAxis   /= rotAxisLen;
        tiltAngle  = acos(clamp(dot(worldUp, terrainNormal), -1.0, 1.0));
    }

    float hash = rand(instancePos.xz);

    // ── Wind / bend ───────────────────────────────────────────────────────────
    float bendStrength  = mix(0.2, 0.4, hash);
    float bendStart     = mix(0.0, 0.2, hash);
    float t             = clamp((position.y / 2.0 - bendStart) / (1.0 - bendStart), 0.0, 1.0);
    float topBendFactor = bezier(t, 0.1);

    float gentleSway = sin(uTime * uSpeed * 0.8 + hash * 10.0) * 0.08;
    float wave       = cnoise(instancePos.xz * 0.3 + vec2(uTime * uSpeed * 0.2, 0.0));
    float strongWind = wave * 0.4;

    vec3 localPos = position;
    localPos.z += bendStrength * topBendFactor + gentleSway * t;
    localPos.x += strongWind * pow(localPos.y, 2.0);

    // ── Scale (extracted from instance matrix) ────────────────────────────────
    float scaleX = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
    float scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
    float scaleZ = length(vec3(instanceMatrix[2][0], instanceMatrix[2][1], instanceMatrix[2][2]));
    localPos    *= vec3(scaleX, scaleY, scaleZ);

    // ── Slope tilt ────────────────────────────────────────────────────────────
    if (tiltAngle > 0.001) {
        localPos = rotateAround(localPos, rotAxis, tiltAngle);
    }

    vec3 worldPos = vec3(instancePos.x, terrainY, instancePos.z) + localPos;

    // ── Player interaction – pure bending, NO underground push ───────────────
    // Only tips bend (position.y > 0.3); base stays planted
    float heightInfluence = smoothstep(0.0, 1.0, position.y);
    float distToPlayer    = distance(vec3(worldPos.x, 0.0, worldPos.z),
                                     vec3(uInteractionPoint.x, 0.0, uInteractionPoint.z));
    if (distToPlayer < uInteractionRadius) {
        float influence      = 1.0 - smoothstep(0.0, uInteractionRadius, distToPlayer);
        influence            = influence * influence;
        vec3 dirFromPlayer   = normalize(worldPos - uInteractionPoint);
        dirFromPlayer.y      = 0.0; // keep horizontal – no sink
        worldPos += dirFromPlayer * influence * uInteractionStrength * heightInfluence;
    }

    // ── LOD band alpha (smooth fade at inner AND outer edges) ─────────────────
    float distToCenter2D = distance(
        vec3(worldPos.x, 0.0, worldPos.z),
        vec3(uPlayerPosition.x, 0.0, uPlayerPosition.z)
    );

    // Outer fade
    float outerFade = 1.0 - smoothstep(uVisibleRadius - uFadeWidth, uVisibleRadius, distToCenter2D);
    // Inner fade for mid/far LOD bands (avoids overlap with denser LOD0)
    float innerFade = smoothstep(uLodInner, uLodInner + uFadeWidth, distToCenter2D);
    float bandAlpha = outerFade * innerFade;

    // Staggered per-blade reveal via a hash offset against uRevealSeed
    // This makes blades appear one-by-one rather than all at once
    float bladePhase = fract(hash * 1000.0 + uRevealSeed * 0.01);
    // bandAlpha modulates the reveal threshold;
    // blades with low bladePhase appear first.
    float revealAlpha = smoothstep(bladePhase - 0.05, bladePhase + 0.05, bandAlpha);

    vAlpha = clamp(revealAlpha, 0.0, 1.0);

    // Sink invisible blades below ground instead of branching (GPU-friendly)
    worldPos.y -= (1.0 - vAlpha) * 10.0;

    // ── Clip space ────────────────────────────────────────────────────────────
    vec4 viewPosition = uViewMatrix * vec4(worldPos, 1.0);
    gl_Position       = uProjectionMatrix * viewPosition;

    // ── Varyings ─────────────────────────────────────────────────────────────
    vElevation    = position.y;
    vPosition     = worldPos;
    vSideGradient = 1.0 - ((position.x + uHalfWidth) / (2.0 * uHalfWidth));

    // Blade outward-facing normal:
    // Each blade is a flat quad rotated by instanceMatrix. We want a normal
    // that faces outward from the instance's Y-axis rotation so lighting
    // reacts to the blade orientation rather than just the terrain slope.
    // We extract the blade's local X-axis (right) and cross it with world-up
    // to get a normal that faces outward for that blade.
    vec3 bladeRight = normalize(vec3(
        instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]
    ));
    // Face normal: perpendicular to blade's local right and world-up
    vec3 bladeNormal = normalize(cross(bladeRight, vec3(0.0, 1.0, 0.0)));
    // Blend in terrain normal so slope blades look grounded
    vec3 faceNormal  = normalize(mix(bladeNormal, terrainNormal, 0.3));

    vNormal    = faceNormal;
    vFakeNormal = faceNormal;

    vViewDir    = normalize(cameraPosition - worldPos);

    vColorNoise = fract(hash * 43758.5453) * 0.07 - 0.035;
}
`;