// Fluted (ribbed) glass — rib distortion adapted from Paper Shaders' fluted-glass
// (Apache-2.0, https://github.com/paper-design/shaders). Here it refracts our own
// procedural scene: a palette gradient + a "sun" disc and ring that follow the cursor.
export const flutedGlass = /* glsl */ `
vec3 flutedScene(vec2 uv, vec2 p, float t, vec2 m) {
  vec3 col = mix(pal(.15 + uv.y * .35 + t * .02), pal(.6 + uv.x * .3), smoothstep(.2, .9, uv.x + .2 * sin(t * .3 + uv.y * 3.)));
  float d = length(p - m);
  col = mix(col, pal(.85 + t * .03), smoothstep(.24, .22, d));
  col = mix(col, vec3(1.), smoothstep(.012, .0, abs(d - .34)) * .9);
  float bar = smoothstep(.01, .0, abs(p.y + .25 * sin(p.x * 2. + t * .4)) - .04);
  return mix(col, pal(.4), bar);
}
vec3 flutedGlass(vec2 uv, vec2 p, float t, vec2 m) {
  float ribs = 28.;
  float bend = .9 * exp(-dot(p - m, p - m) * 5.);
  float gx = uv.x * ribs + bend * sin(p.y * 5. + t * .6);
  float x = fract(gx);
  float wave = sin((x + .25) * 6.28318);
  float shadows = .5 + .5 * asin(clamp(wave, -1., 1.)) / 1.5708;
  vec2 suv = uv + vec2(wave * .5 * 1.6 / ribs, 0.);
  vec2 sp = p + vec2(wave * .5 * 1.6 / ribs, 0.);
  vec3 col = flutedScene(suv, sp, t, m);
  col *= .78 + .4 * shadows;
  float aa = fwidth(gx) * 1.5;
  col += .18 * (1. - smoothstep(0., aa + .04, x) * smoothstep(1., 1. - aa - .04, x));
  return col;
}
`
