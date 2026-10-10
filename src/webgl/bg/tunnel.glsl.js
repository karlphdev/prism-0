// Infinite log-polar tunnel: depth = 1/r, so it repeats forever (Droste-like).
// uTravel is accumulated in JS and speeds up with scroll velocity.
export const tunnel = /* glsl */ `
uniform float uTravel;
vec3 tunnel(vec2 p, float t, vec2 m) {
  vec2 q = p - m * .12;
  float r = length(q);
  float a = atan(q.y, q.x);
  float z = .32 / max(r, 1e-3);
  float u = a / 6.28318 * 10. + z * .35;
  float v = z + uTravel;
  float cells = .5 + .5 * sin(u * 6.28318) * sin(v * 6.28318 * 1.5);
  vec3 col = pal(v * .12 + a / 6.28318);
  col *= .25 + .9 * smoothstep(.35, .65, cells);
  float ring = smoothstep(.06, .0, abs(fract(v * 1.5) - .5) - .44);
  col += pal(v * .12 + .5) * ring * .6;
  float fog = smoothstep(.0, .45, r);
  col *= fog;
  col += pal(t * .05) * exp(-r * r * 60.) * 1.2;
  return col;
}
`
