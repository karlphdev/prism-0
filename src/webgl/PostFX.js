import { HalfFloatType } from 'three'
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, NoiseEffect, VignetteEffect, BlendFunction,
} from 'postprocessing'
import { FluidRefractionEffect } from './effects/FluidRefractionEffect.js'
import { ColorGradeEffect } from './effects/ColorGradeEffect.js'

export class PostFX {
  constructor(renderer, scene, camera, { reduced = false } = {}) {
    this.reduced = reduced
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
    this.composer.addPass(new RenderPass(scene, camera))

    // fluid refraction + chromatic split first, so bloom/grade see the bent image
    this.refraction = new FluidRefractionEffect()
    this.composer.addPass(new EffectPass(camera, this.refraction))

    this.bloom = new BloomEffect({ luminanceThreshold: 0.75, luminanceSmoothing: 0.3, mipmapBlur: true, intensity: 0.4 })
    this.grade = new ColorGradeEffect()
    this.vignette = new VignetteEffect({ offset: 0.3, darkness: 0.3 })
    this.noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN })
    this.noise.blendMode.opacity.value = reduced ? 0 : 0.1
    this.composer.addPass(new EffectPass(camera, this.bloom, this.grade, this.vignette, this.noise))

    this.kick = 0 // extra burst on click
    this.hue = 0
    this.strengthMul = 1
  }

  setSize(w, h) {
    this.composer.setSize(w, h)
  }

  update(state, mouse, scrollVelocity, velocityTexture, dt) {
    this.bloom.intensity = state.bloom + this.kick * 1.5
    this.vignette.darkness = state.vignette

    const r = this.refraction.uniforms
    r.get('uVelocity').value = velocityTexture
    r.get('uStrength').value = this.reduced ? 0 : 0.0001 * state.fluid * this.strengthMul
    const speed = this.reduced ? 0 : mouse.velocity * 0.0015 + Math.abs(scrollVelocity) * 0.0008
    const ca = state.ca * 4 + speed + this.kick * 0.04
    r.get('uCA').value.set(ca, ca)

    // slow hue cycle, faster while scrolling hard
    if (!this.reduced) this.hue += dt * (0.02 + Math.min(Math.abs(scrollVelocity) * 0.004, 0.3))
    const g = this.grade.uniforms
    g.get('uSat').value = state.sat + this.kick * 0.6
    g.get('uHue').value = Math.sin(this.hue) * 0.35
  }

  render(dt) {
    this.composer.render(dt)
  }
}
