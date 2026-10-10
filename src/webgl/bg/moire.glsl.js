// Op-art moiré: two concentric ring fields (one follows the cursor) interfere,
// then get ordered-dithered into two palette colors.
// Bayer 4x4 matrix as used in Paper Shaders' dithering (Apache-2.0).
export const moire = /* glsl */ `
const float BAYER4[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float bayer4(vec2 px) {
  ivec2 q = ivec2(mod(floor(px), 4.));
  return BAYER4[q.y * 4 + q.x] / 16.;
}
vec3 moire(vec2 p, float t, vec2 m) {
  vec2 c1 = .3 * vec2(cos(t * .13), sin(t * .1));
  vec2 c2 = m * .9;
  float f = 95.;
  float r1 = sin(length(p - c1) * f - t * .4);
  float r2 = sin(length(p - c2) * f);
  float lum = .5 + .5 * r1 * r2;
  lum = mix(lum, smoothstep(.2, .8, lum), .5);
  float tint = length(p - c2) * .9 + t * .02;
  float on = step(bayer4(gl_FragCoord.xy / 2.), lum);
  vec3 hi = pal(tint);
  vec3 lo = pal(tint + .5) * .18;
  return mix(lo, hi, on);
}
`
