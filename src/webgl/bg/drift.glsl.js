// Peripheral-drift illusion (principle of Kitaoka's "rotating snakes", regenerated
// procedurally): rings of repeating black → dark color → white → light color steps
// seem to rotate when your eyes move. Between the discs: a scintillating grid
// (grey bars with white dots that flicker dark in peripheral vision).
export const drift = /* glsl */ `
vec3 drift(vec2 p, float t) {
  float cell = .46;
  vec2 g = p / cell + vec2(.5, .3);
  vec2 id = floor(g);
  vec2 f = fract(g) - .5;
  float r = length(f);
  float a = atan(f.y, f.x);

  float dir = mod(id.x + id.y, 2.) * 2. - 1.;
  float ring = floor(r * 11.);
  float rdir = dir * (mod(ring, 2.) * 2. - 1.);
  float s = fract(a / 6.28318 * 20. * rdir + ring * .37 + t * .004 * rdir);

  float hue = .1 + (id.x * .17 + id.y * .11);
  vec3 dark = pal(hue) * .55;
  vec3 light = mix(pal(hue + .35), vec3(1.), .35);
  vec3 seq = s < .25 ? vec3(.02) : s < .5 ? dark : s < .75 ? vec3(1.) : light;
  float disc = smoothstep(.47, .45, r);

  // scintillating grid
  vec2 gp = p * 9.;
  vec2 gf = abs(fract(gp) - .5);
  float bar = step(.42, max(gf.x, gf.y));
  float dot_ = smoothstep(.16, .12, length(fract(gp + .5) - .5));
  vec3 grid = mix(pal(hue + .6) * .1, vec3(.42), bar);
  grid = mix(grid, vec3(1.), dot_);

  return mix(grid, seq, disc);
}
`
