export const grassFragmentShader = /* glsl */ `
precision mediump float;

uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFogColor;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;
varying float vColorNoise;

vec3 directionalLight(vec3 lightColor, float lightIntensity, vec3 normal, vec3 lightPosition, vec3 viewDirection, float specularPower){
    vec3 lightDirection = normalize(lightPosition);
    vec3 lightReflection = reflect(-lightDirection, normal);

    float shading = dot(normal, lightDirection);
    shading = max(0.0, shading);

    float specular = -dot(lightReflection, viewDirection);
    specular = max(0.0, specular);
    specular = pow(specular, specularPower) * shading;

    return lightColor * lightIntensity * (shading + specular);
}

vec3 ambientLight(vec3 lightColor, float lightIntensity)
{
    return lightColor * lightIntensity;
}

void main()
{
    float gradient = smoothstep(0.0, 1.0, vElevation);
    vec3 finalColor = mix(uBaseColor, uTipColor, gradient);

    float translucency = pow(gradient, 2.0) * 0.35;
    finalColor += uTipColor * translucency;

    vec3 light = vec3(0.0);
    vec3 normal = gl_FrontFacing ? vFakeNormal : -vFakeNormal;
    vec3 viewDirection = normalize(cameraPosition - vPosition);

    vec3 sunColor = vec3(0.0, 0.98, 0.9);

    light += ambientLight(vec3(1.0, 1.0, 1.0), 0.55);
  

    finalColor *= light;

    // Apply per‑blade colour noise (subtle)
    finalColor += vColorNoise;

    float dist = length(cameraPosition - vPosition);
    float fogFactor = smoothstep(45.0, 45.0, dist);
    finalColor = mix(finalColor + 0.4, uFogColor + .1, fogFactor);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
