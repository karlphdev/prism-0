import { HalfFloatType, Vector2 } from 'three'
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, NoiseEffect, VignetteEffect, ChromaticAberrationEffect, PixelationEffect, BlendFunction,
} from 'postprocessing'

export class PostFX {
  constructor(renderer, scene, camera, { reduced = false } = {}) {
    this.reduced = reduced
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
    this.composer.addPass(new RenderPass(scene, camera))

    this.pixel = new PixelationEffect(0)
    this.pixelPass = new EffectPass(camera, this.pixel)
    this.pixelPass.enabled = false
    this.composer.addPass(this.pixelPass)

    this.bloom = new BloomEffect({ luminanceThreshold: 0.55, luminanceSmoothing: 0.3, mipmapBlur: true, intensity: 0.3 })
    this.noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN })
    this.noise.blendMode.opacity.value = reduced ? 0 : 0.12
    this.vignette = new VignetteEffect({ offset: 0.3, darkness: 0.3 })
    this.composer.addPass(new EffectPass(camera, this.bloom, this.vignette, this.noise))

    this.caOffset = new Vector2()
    this.ca = new ChromaticAberrationEffect({ offset: this.caOffset, radialModulation: true, modulationOffset: 0.1 })
    this.caPass = new EffectPass(camera, this.ca)
    this.composer.addPass(this.caPass)

    this.kick = 0 // extra burst on click
  }

  setSize(w, h) {
    this.composer.setSize(w, h)
  }

  update(state, mouse, scrollVelocity) {
    this.bloom.intensity = state.bloom + this.kick * 1.5
    this.vignette.darkness = state.vignette

    const speed = this.reduced ? 0 : mouse.velocity * 0.0012 + Math.abs(scrollVelocity) * 0.0004
    const amt = state.ca + speed + this.kick * 0.012
    this.caOffset.set(amt * (0.6 + mouse.smooth.x * 0.4), amt * (0.3 + mouse.smooth.y * 0.4))
    this.caPass.enabled = amt > 0.0002

    const g = Math.round(state.pixel + this.kick * 10)
    this.pixelPass.enabled = !this.reduced && g >= 2
    if (this.pixelPass.enabled) this.pixel.granularity = g
  }

  render(dt) {
    this.composer.render(dt)
  }
}
