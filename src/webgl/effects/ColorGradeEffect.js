import { Uniform } from 'three'
import { Effect } from 'postprocessing'

// Saturation boost + hue rotation (YIQ) + gentle contrast curve.
const fragment = /* glsl */ `
uniform float uSat, uHue, uContrast;

vec3 hueRotate(vec3 c, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + a;
  float chroma = length(yiq.yz);
  return toRGB * vec3(yiq.x, chroma * cos(h), chroma * sin(h));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  c = hueRotate(c, uHue);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  vec3 cc = clamp(c, 0.0, 1.0);
  c = mix(c, cc * cc * (3.0 - 2.0 * cc), uContrast);
  outputColor = vec4(max(c, 0.0), inputColor.a);
}
`

export class ColorGradeEffect extends Effect {
  constructor() {
    super('ColorGradeEffect', fragment, {
      uniforms: new Map([
        ['uSat', new Uniform(1)],
        ['uHue', new Uniform(0)],
        ['uContrast', new Uniform(0.15)],
      ]),
    })
  }
}
