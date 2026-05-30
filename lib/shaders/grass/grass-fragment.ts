export const grassFragmentShader = /* glsl */ `
precision mediump float;

uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFogColor;

varying float vElevation;
varying float vSideGradient;
varying vec3  vNormal;
varying vec3  vFakeNormal;
varying vec3  vPosition;
varying float vColorNoise;
varying float vAlpha;
varying vec3  vViewDir;

// ── Toon cel quantise: snap NdotL into N discrete bands ──────────────────────
float celShade(float value, float bands) {
    return floor(value * bands) / bands;
}

void main() {
    if (vAlpha < 0.02) discard;

    // Flip normal for back faces (DoubleSide – gl_FrontFacing is fragment-only)
    vec3 N = gl_FrontFacing ? vFakeNormal : -vFakeNormal;

    // ── 1. Base colour gradient (base → mid → tip) ───────────────────────────
    // Three-stop gradient for more natural look
    float t = clamp(vElevation, 0.0, 1.0);

    // Rich dark soil-shadow base, lush mid, bright sun-tip
    vec3 colorSoil = vec3(0.04, 0.14, 0.04);   // very dark root
    vec3 colorMid  = uBaseColor;                 // passed in (#1a6e2e or similar)
    vec3 colorTip  = uTipColor;                  // bright tip

    vec3 grassColor;
    if (t < 0.45) {
        grassColor = mix(colorSoil, colorMid, t / 0.45);
    } else {
        grassColor = mix(colorMid, colorTip, (t - 0.45) / 0.55);
    }

    // Per-blade hue noise – subtle yellow/olive variation
    grassColor += vec3(vColorNoise * 1.2, vColorNoise * 0.6, vColorNoise * 0.1);

    // ── 2. Sun directional (warm, from upper-right) ──────────────────────────
    vec3  sunDir       = normalize(vec3(0.6, 1.0, 0.4));
    vec3  sunColor     = vec3(1.0, 0.95, 0.75);
    float NdotL_raw    = dot(N, sunDir);
    // Wrap lighting: let backlit faces get some warmth (SSS approximation)
    float NdotL_wrap   = NdotL_raw * 0.5 + 0.5;  // remap [-1,1] → [0,1]
    // Cel-quantise into 3 bands for toon feel
    float NdotL_cel    = celShade(NdotL_wrap, 3.0) * 0.85 + 0.15;
    vec3  sunLight     = sunColor * NdotL_cel * 0.9;

    // ── 3. Sky ambient (cool blue-green from above) ──────────────────────────
    vec3 skyColor  = vec3(0.3, 0.55, 0.35);
    vec3 skyLight  = skyColor * (0.35 + 0.2 * clamp(N.y, 0.0, 1.0));

    // ── 4. Ground bounce (warm dark-green from below) ────────────────────────
    vec3 groundColor  = vec3(0.05, 0.18, 0.04);
    vec3 groundBounce = groundColor * (0.15 * clamp(-N.y + 0.5, 0.0, 1.0));

    // ── 5. Rim light (bright green edge glow on tips facing camera) ──────────
    float rimDot   = 1.0 - max(0.0, dot(N, vViewDir));
    float rimMask  = pow(rimDot, 3.5) * t * t;          // only on upper half
    vec3  rimLight = colorTip * rimMask * 0.45;

    // ── 6. Subsurface scatter (backlit warmth through blade) ─────────────────
    float sss      = pow(max(0.0, dot(-sunDir, vViewDir)), 4.0);
    sss           *= (1.0 - t) * 0.0 + t * 0.3;        // stronger at tips
    vec3  sssLight = vec3(0.6, 1.0, 0.3) * sss * 0.35;

    // ── 7. Combine ───────────────────────────────────────────────────────────
    vec3 lighting  = sunLight + skyLight + groundBounce + rimLight + sssLight;
    vec3 finalColor = grassColor * lighting;

    // ── 8. Toon outline darkening at base ────────────────────────────────────
    // Darken very bottom vertices for a cel-style grounded look
    float baseDarken = 1.0 - (1.0 - smoothstep(0.0, 0.25, t)) * 0.55;
    finalColor *= baseDarken;

    // ── 9. Distance fog ──────────────────────────────────────────────────────
    float dist      = length(cameraPosition - vPosition);
    float fogFactor = smoothstep(38.0, 55.0, dist);
    vec3  fogCol    = uFogColor * 0.8 + vec3(0.1, 0.22, 0.1);
    finalColor      = mix(finalColor, fogCol, fogFactor * 0.75);

    // ── 10. Very subtle brightness boost so field doesn't look muddy ─────────
    finalColor = pow(finalColor, vec3(0.88)); // mild gamma lift

    gl_FragColor = vec4(finalColor, vAlpha);
}
`;