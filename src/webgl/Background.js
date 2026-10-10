import * as THREE from 'three'
import { paletteGLSL } from './palette.glsl.js'
import { meshGradient } from './bg/meshGradient.glsl.js'
import { flutedGlass } from './bg/flutedGlass.glsl.js'
import { moire } from './bg/moire.glsl.js'
import { tunnel } from './bg/tunnel.glsl.js'
import { drift } from './bg/drift.glsl.js'

// Full-screen background. One shader holds every mode; scroll crossfades
// between the current chapter's mode (A) and the next one (B).
// Fluid dye is screened on top, then the editorial grid.
export class Background {
  constructor({ reduced = false } = {}) {
    this.reduced = reduced
    this.travel = 0
    this.uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
      uModeA: { value: 0 },
      uModeB: { value: 0 },
      uMix: { value: 0 },
      uTravel: { value: 0 },
      uDye: { value: null },
      uFluid: { value: 1 },
      uPalA: { value: new THREE.Vector3() },
      uPalB: { value: new THREE.Vector3() },
      uPalC: { value: new THREE.Vector3() },
      uPalD: { value: new THREE.Vector3() },
    }

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uModeA, uModeB, uMix, uFluid;
        uniform vec2 uMouse, uRes;
        uniform sampler2D uDye;
        varying vec2 vUv;
        ${paletteGLSL}
        ${meshGradient}
        ${flutedGlass}
        ${moire}
        ${tunnel}
        ${drift}

        vec3 mode(float id, vec2 uv, vec2 p, vec2 m) {
          if (id < .5) return meshGradient(uv, uTime, uMouse);
          if (id < 1.5) return flutedGlass(uv, p, uTime, m);
          if (id < 2.5) return moire(p, uTime, m);
          if (id < 3.5) return tunnel(p, uTime, m);
          return drift(p, uTime);
        }

        void main() {
          vec2 asp = vec2(uRes.x / uRes.y, 1.0);
          vec2 p = (vUv - .5) * asp;
          vec2 m = (uMouse - .5) * asp;

          vec3 col = mode(uModeA, vUv, p, m);
          if (uMix > .001) col = mix(col, mode(uModeB, vUv, p, m), uMix);

          // editorial grid, 12 columns, tinted
          vec2 gq = vec2(vUv.x * 12.0, vUv.y * 12.0 / asp.x);
          vec2 cell = fract(gq), fw = fwidth(gq);
          float line = 1.0 - min(smoothstep(0.0, fw.x * 1.5, cell.x), smoothstep(0.0, fw.y * 1.5, cell.y));
          col = mix(col, vec3(1.0), line * .06);

          col = pow(col, vec3(2.2)); // display → linear (composer outputs sRGB)

          // fluid ink, screen blend so it glows on dark and tints on light
          vec3 dye = min(texture2D(uDye, vUv).rgb * uFluid, vec3(1.0));
          col = 1.0 - (1.0 - col) * (1.0 - dye);

          gl_FragColor = vec4(col, 1.0);
        }`,
    })

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -1
  }

  resize(w, h) {
    this.uniforms.uRes.value.set(w, h)
  }

  update(state, dt, time, mouseNdc, scrollVelocity, dyeTexture) {
    const u = this.uniforms
    u.uTime.value = this.reduced ? 12 : time
    u.uModeA.value = state.modeA
    u.uModeB.value = state.modeB
    u.uMix.value = state.modeMix
    u.uPalA.value.copy(state.palA)
    u.uPalB.value.copy(state.palB)
    u.uPalC.value.copy(state.palC)
    u.uPalD.value.copy(state.palD)
    u.uFluid.value = state.fluid
    u.uDye.value = dyeTexture
    u.uMouse.value.set(mouseNdc.x * 0.5 + 0.5, mouseNdc.y * 0.5 + 0.5)
    if (!this.reduced) this.travel += dt * (0.5 + Math.min(Math.abs(scrollVelocity) * 0.08, 4))
    u.uTravel.value = this.travel
  }
}
