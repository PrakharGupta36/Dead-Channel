export const grassVertexShader = /* glsl */ `
uniform float uTime;
uniform vec3 uPlayerPos;
uniform float uRadius;

attribute vec2 aInstanceOffset;

varying float vElevation;
varying vec3 vWorldPos;
varying float vAlpha;
varying float vWind;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// MATCHES GROUND.TSX EXACTLY: Combined gentle roll and minor bumps
float getTerrainHeight(float x, float z) {
    float gentleRoll = sin(x * 0.02) * cos(z * 0.02) * 0.2;
    float minorBumps = sin(x * 0.15) * sin(z * 0.15) * 0.7;
    return gentleRoll + minorBumps;
}

void main() {
    vElevation = position.y * 2.0; 
    float range = uRadius * 2.0;

    // 1. Precise Grid Snapping 
    vec3 worldAnchor = vec3(0.0);
    worldAnchor.x = floor((uPlayerPos.x - aInstanceOffset.x) / range + 0.5) * range + aInstanceOffset.x;
    worldAnchor.z = floor((uPlayerPos.z - aInstanceOffset.y) / range + 0.5) * range + aInstanceOffset.y;
    
    // Calculate precise terrain height, adding a microscopic offset (+ 0.01) 
    // to keep grass bases beautifully flush but clear of Z-fighting.
    worldAnchor.y = getTerrainHeight(worldAnchor.x, worldAnchor.z) + 0.01;

    float h = hash(worldAnchor.xz);

    // 2. High Performance Sines/Cosines Rotation Bypass
    vec3 localPos = position;
    localPos.xyz *= vec3(0.9 + h * 0.3, 0.8 + h * 0.4, 0.9 + h * 0.3);

    float angle = h * 6.283185;
    float sa = sin(angle);
    float ca = cos(angle);
    
    float rx = localPos.x * ca - localPos.z * sa;
    float rz = localPos.x * sa + localPos.z * ca;
    localPos.x = rx;
    localPos.z = rz;

    // 3. Fast Horizon Culling
    float dist = distance(worldAnchor.xz, uPlayerPos.xz);
    vAlpha = 1.0 - smoothstep(uRadius * 0.75, uRadius, dist);

    if (vAlpha <= 0.0) {
        gl_Position = vec4(0.0);
        return;
    }

    // 4. Combined Wave Synthesis 
    float windCoord = (worldAnchor.x + worldAnchor.z) * 0.05 + uTime * 1.1;
    vWind = sin(windCoord) * 0.5 + 0.5;

    float bend = vElevation * vElevation;
    localPos.x += vWind * 0.35 * bend;
    localPos.z += vWind * 0.15 * bend;
    localPos.y -= vWind * 0.12 * bend;

    vWorldPos = worldAnchor + localPos;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
}
`;
