// Procedural WebGL2 shader. One stable world-space point lattice is sampled through
// different coordinate transforms, so zoom and mode changes don't swap particle populations.
export const VERTEX_SHADER = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform float uDensity;
uniform float uBlend;
uniform float uSeed;
uniform int uFromMode;
uniform int uToMode;

out vec4 outColor;

#define PI 3.141592653589793
#define TAU 6.283185307179586

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  return vec2(hash21(p), hash21(p + 71.13));
}

vec2 turn(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

// All modes warp the same spatial field; the lattice itself is not replaced.
vec2 warp(vec2 p, int mode, float t) {
  if (mode == 0) {
    // Origin / barely moving close-eyed grain
    return p + 0.008 * vec2(
      sin(2.0 * p.y + t * 0.38),
      cos(2.0 * p.x - t * 0.31)
    );
  }
  if (mode == 1) {
    return p + 0.055 * vec2(
      sin(p.y * 4.2 + t * 0.44),
      cos(p.x * 3.5 - t * 0.34)
    );
  }
  if (mode == 2) {
    // Mostly straight square array
    return p + 0.013 * vec2(
      sin(p.y * 5.0 + t * 0.2),
      cos(p.x * 4.4 + t * 0.25)
    );
  }
  if (mode == 3) {
    float r = length(p);
    return turn(p, 0.65 * sin(t * 0.28) / (1.0 + r * 2.4) + 0.55 * r);
  }

  // Six gently counter-rotating regions; modeled, not observed physics.
  vec2 displacement = vec2(0.0);
  for (int j = 0; j < 6; j++) {
    float a = float(j) * TAU / 6.0;
    vec2 center = vec2(cos(a), sin(a)) * 0.43;
    vec2 offset = p - center;
    float influence = exp(-dot(offset, offset) * 15.0);
    float direction = mod(float(j), 2.0) < 0.5 ? 1.0 : -1.0;
    displacement += (turn(offset, direction * sin(t * 0.34) * 0.53) - offset) * influence;
  }
  return p + displacement;
}

vec3 spectrum(float h) {
  // A cool weighted rainbow keeps the small field points softly luminous.
  return 0.55 + 0.45 * cos(TAU * (vec3(0.06, 0.34, 0.66) + h));
}

vec3 pointField(vec2 world, float detail, float now) {
  vec2 cellPos = world * detail;
  vec2 cell = floor(cellPos);
  vec2 local = fract(cellPos);
  vec2 jitter = hash22(cell + uSeed * 17.0);
  vec2 location = 0.5 + (jitter - 0.5) * 0.26;
  float distanceToPoint = length(local - location);

  // fwidth antialiasing avoids pretending all virtual points resolve to screen pixels.
  float footprint = max(fwidth(cellPos.x), fwidth(cellPos.y));
  float core = 1.0 - smoothstep(0.085, 0.21 + min(footprint, 1.0) * 0.25, distanceToPoint);
  float aliasMix = smoothstep(0.65, 2.0, footprint);
  float grain = hash21(floor(cellPos + vec2(0.18, 0.43)));
  float shimmer = 0.85 + 0.15 * sin(now * 0.48 + grain * TAU);
  float brightness = mix(core, 0.24 + 0.45 * grain, aliasMix) * shimmer;

  float hue = hash21(cell + uSeed * 11.7);
  vec3 color = spectrum(hue);
  return color * brightness;
}

void main() {
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  vec2 position = (uv - 0.5) * 2.0 / max(uZoom, 0.001);
  float transition = smoothstep(0.0, 1.0, clamp(uBlend, 0.0, 1.0));
  vec2 fromPosition = warp(position, uFromMode, uTime);
  vec2 toPosition = warp(position, uToMode, uTime);
  vec2 fieldPosition = mix(fromPosition, toPosition, transition);

  vec3 micro = pointField(fieldPosition, uDensity * 0.5, uTime);
  vec3 secondary = pointField(fieldPosition * 0.31 + vec2(0.2, 0.37), uDensity * 0.21, uTime);
  float radius = length((uv - 0.5) * vec2(1.02, 1.02));
  float atmosphere = 1.0 - smoothstep(0.08, 0.76, radius);
  vec3 background = vec3(0.012, 0.019, 0.045)
    + atmosphere * vec3(0.027, 0.025, 0.066);

  vec3 result = background + micro * 0.64 + secondary * 0.14;
  result *= 1.0 - 0.38 * smoothstep(0.22, 0.76, radius);
  outColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;
