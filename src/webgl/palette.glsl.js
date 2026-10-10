// Inigo Quilez cosine palette — https://iquilezles.org/articles/palettes/
// Returns display-space (sRGB-ish) color; Background converts to linear once at the end.
export const paletteGLSL = /* glsl */ `
uniform vec3 uPalA, uPalB, uPalC, uPalD;
vec3 pal(float t) {
  return clamp(uPalA + uPalB * cos(6.28318 * (uPalC * t + uPalD)), 0.0, 1.0);
}
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`
