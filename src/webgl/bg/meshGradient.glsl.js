// Mesh gradient — adapted from Paper Shaders (Apache-2.0, https://github.com/paper-design/shaders)
// Colors come from our cosine palette; color point 0 is pulled toward the cursor.
export const meshGradient = /* glsl */ `
vec2 mgPos(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);
  return .5 + .5 * vec2(sin(t * b + a), cos(t * c + a * 1.5));
}
vec3 meshGradient(vec2 uv, float time, vec2 mUv) {
  float t = .5 * (time + 41.5);
  float radius = smoothstep(0., 1., length(uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    uv.x += .8 * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
    uv.y += .8 * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
  }
  uv = rot2(-.9 * radius) * (uv - .5) + .5;
  vec3 col = vec3(0.);
  float total = 0.;
  for (int i = 0; i < 5; i++) {
    vec2 pos = mgPos(i, t);
    if (i == 0) pos = mix(pos, mUv, .65);
    float w = 1. / (pow(length(uv - pos), 3.5) + 1e-3);
    col += pal(float(i) / 5.) * w;
    total += w;
  }
  return col / total;
}
`
