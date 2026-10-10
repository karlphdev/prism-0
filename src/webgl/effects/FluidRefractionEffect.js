import { Uniform, Vector2 } from 'three'
import { Effect, EffectAttribute } from 'postprocessing'

// Bends the whole rendered frame along the fluid's velocity field, splitting
// R/G/B by different amounts (fluid-driven chromatic aberration). Also carries
// the cursor-speed radial aberration that used to live in its own pass.
const fragment = /* glsl */ `
uniform sampler2D uVelocity;
uniform float uStrength;
uniform vec2 uCA;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 vel = texture2D(uVelocity, uv).xy;
  vec2 off = -vel * uStrength;
  vec2 radial = (uv - .5) * uCA;
  float r = texture2D(inputBuffer, uv + off * 1.25 + radial).r;
  float g = texture2D(inputBuffer, uv + off).g;
  float b = texture2D(inputBuffer, uv + off * .75 - radial).b;
  outputColor = vec4(r, g, b, inputColor.a);
}
`

export class FluidRefractionEffect extends Effect {
  constructor() {
    super('FluidRefractionEffect', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['uVelocity', new Uniform(null)],
        ['uStrength', new Uniform(0)],
        ['uCA', new Uniform(new Vector2())],
      ]),
    })
  }
}
