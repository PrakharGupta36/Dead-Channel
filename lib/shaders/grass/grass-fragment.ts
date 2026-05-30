export const grassFragmentShader = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uMiddleColor;
uniform vec3 uTipColor;
uniform vec3 uFogColor;
uniform vec3 uPlayerPos;

varying float vElevation; // 0.0 at base, 1.0 at tip (.5 height)
varying vec3 vWorldPos;
varying float vAlpha;
varying float vWind;

void main() {
    // 1. NON-LINEAR COLOR MIXING (Gives a lush, organic gradient)
    // We warp the elevation with a power function to give the base color more weight,
    // which prevents the grass from looking washed out at 0.5 height.
    float warpedElevation = pow(vElevation, 1.2);
    vec3 mixedColor = mix(uBaseColor, uMiddleColor, smoothstep(0.0, 0.5, warpedElevation));
    mixedColor = mix(mixedColor, uTipColor, smoothstep(0.3, 1.0, warpedElevation));

    // 2. FAKE OCCLUSION & SUBSURFACE SCATTERING (The "Secret Sauce")
    // - Ground Shadow: Darkens the absolute bottom drastically to simulate self-shadowing.
    // - Translucency: Tips catch light from behind, giving that glowing, vibrant nature look.
    float groundOcclusion = smoothstep(0.0, 0.3, vElevation) * 0.85 + 0.15;
    float translucency = pow(vElevation, 2.0) * 0.35;
    
    // 3. FAKE DIRECTIONAL LIGHTING & HIGHLIGHTS
    // Simulate a sun pointing slightly downward to give the blades depth as they curve
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float fakeLighting = dot(vec3(0.0, 1.0, 0.0), lightDir) * 0.4 + 0.6;
    
    // Combine base lighting with occlusion
    vec3 litColor = mixedColor * fakeLighting * groundOcclusion;
    // Inject subsurface glow towards the tips
    litColor += uTipColor * translucency;

    // 4. DYNAMIC WIND SHIMMER & SPECULAR COAT
    // Creates a subtle, silky wind gleam across the field instead of a harsh flat color
    float windGleam = pow(vWind, 4.0) * 0.25 * step(0.4, vElevation);
    vec3 finalColor = litColor + vec3(windGleam);

    // 5. DISTANCE FOG & HORIZON BLENDING
    float cameraDist = distance(cameraPosition, vWorldPos);
    // Adjusted fog range slightly to perfectly match your 55 visible radius setting
    float fogFactor = smoothstep(25.0, 60.0, cameraDist);
    
    // Smoothly blend into the background fog
    gl_FragColor = vec4(mix(finalColor, uFogColor, fogFactor), vAlpha);
}
`;