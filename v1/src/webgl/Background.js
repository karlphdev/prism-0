import * as THREE from 'three'
import { snoise } from './noise.glsl.js'

// v1: gradient with a soft liquid light that follows the cursor, plus a faint editorial grid.
export class Background {
  constructor() {
    this.uniforms = {
      uTime: { value: 0 },
      uA: { value: new THREE.Color() },
      uB: { value: new THREE.Color() },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uGlow: { value: 0.5 },
      uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
      uScroll: { value: 0 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uGlow, uScroll;
        uniform vec3 uA, uB;
        uniform vec2 uMouse, uRes;
        varying vec2 vUv;
        ${snoise}
        void main() {
          vec2 asp = vec2(uRes.x / uRes.y, 1.0);
          vec2 p = vUv * asp;

          float n = snoise(vec3(p * 1.2, uTime * 0.05 + uScroll * 0.1));
          vec3 col = mix(uB, uA, smoothstep(-0.2, 1.1, vUv.y + n * 0.15));

          vec2 m = uMouse * asp;
          vec2 q = p + 0.08 * vec2(snoise(vec3(p * 3.0, uTime * 0.2)), snoise(vec3(p * 3.0 + 7.0, uTime * 0.2)));
          float g = smoothstep(0.55, 0.0, distance(q, m));
          vec3 glowCol = mix(uA, vec3(1.0), 0.22);
          col = mix(col, glowCol, g * uGlow);

          vec2 cell = fract(vec2(vUv.x * 12.0, (vUv.y * 12.0) / asp.x));
          vec2 fw = fwidth(vec2(vUv.x * 12.0, (vUv.y * 12.0) / asp.x));
          float line = 1.0 - min(smoothstep(0.0, fw.x * 1.5, cell.x), smoothstep(0.0, fw.y * 1.5, cell.y));
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, lum > 0.4 ? vec3(0.0) : vec3(1.0), line * 0.045);

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

  update(state, time, mouseNdc, progress) {
    const u = this.uniforms
    u.uTime.value = time
    u.uA.value.copy(state.bgA)
    u.uB.value.copy(state.bgB)
    u.uGlow.value = state.glow
    u.uScroll.value = progress
    u.uMouse.value.set(mouseNdc.x * 0.5 + 0.5, mouseNdc.y * 0.5 + 0.5)
  }
}
