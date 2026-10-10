import * as THREE from 'three'

// Stable-fluids solver (advection → curl/vorticity → divergence → pressure → projection).
// Ported to three.js from Pavel Dobryakov's WebGL-Fluid-Simulation (MIT):
// https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
// Exposes `dye` (colored ink) and `velocity` textures for the background and postFX.

const baseVert = /* glsl */ `
  uniform vec2 texelSize;
  varying vec2 vUv, vL, vR, vT, vB;
  void main() {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }`

const FRAG = {
  splat: /* glsl */ `
    uniform sampler2D uTarget;
    uniform float aspectRatio, radius;
    uniform vec3 color;
    uniform vec2 point;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv - point;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }`,
  advection: /* glsl */ `
    uniform sampler2D uVelocity, uSource;
    uniform vec2 texelSize;
    uniform float dt, dissipation;
    varying vec2 vUv;
    void main() {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
    }`,
  curl: /* glsl */ `
    uniform sampler2D uVelocity;
    varying vec2 vUv, vL, vR, vT, vB;
    void main() {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`,
  vorticity: /* glsl */ `
    uniform sampler2D uVelocity, uCurl;
    uniform float curl, dt;
    varying vec2 vUv, vL, vR, vT, vB;
    void main() {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
    }`,
  divergence: /* glsl */ `
    uniform sampler2D uVelocity;
    varying vec2 vUv, vL, vR, vT, vB;
    void main() {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x;
      if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y;
      if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,
  clear: /* glsl */ `
    uniform sampler2D uTexture;
    uniform float value;
    varying vec2 vUv;
    void main() { gl_FragColor = value * texture2D(uTexture, vUv); }`,
  pressure: /* glsl */ `
    uniform sampler2D uPressure, uDivergence;
    varying vec2 vUv, vL, vR, vT, vB;
    void main() {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
    }`,
  gradient: /* glsl */ `
    uniform sampler2D uPressure, uVelocity;
    varying vec2 vUv, vL, vR, vT, vB;
    void main() {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }`,
}

function makeTarget(w, h) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
  })
}

class DoubleTarget {
  constructor(w, h) {
    this.read = makeTarget(w, h)
    this.write = makeTarget(w, h)
    this.texel = new THREE.Vector2(1 / w, 1 / h)
  }
  swap() { [this.read, this.write] = [this.write, this.read] }
}

export class Fluid {
  constructor(renderer, { simRes = 128, dyeRes = 512 } = {}) {
    this.renderer = renderer
    this.config = { curl: 28, pressureIters: 18, velocityDissipation: 0.6, dyeDissipation: 0.9, splatRadius: 0.0025, splatForce: 5000 }

    this.res = { simRes, dyeRes }
    this.simTexel = new THREE.Vector2()
    const aspect = innerWidth / innerHeight
    this.allocate(aspect)

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    this.quad.frustumCulled = false
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)

    this.mats = {}
    for (const [name, frag] of Object.entries(FRAG)) {
      this.mats[name] = new THREE.ShaderMaterial({
        vertexShader: baseVert,
        fragmentShader: frag,
        uniforms: {
          texelSize: { value: this.simTexel },
          uTarget: { value: null }, uVelocity: { value: null }, uSource: { value: null },
          uCurl: { value: null }, uPressure: { value: null }, uDivergence: { value: null }, uTexture: { value: null },
          aspectRatio: { value: aspect }, radius: { value: 0 }, color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() },
          dt: { value: 0 }, dissipation: { value: 0 }, curl: { value: 0 }, value: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
      })
    }

    this.queue = []
  }

  // (Re)build all render targets for a screen aspect. Ink is cleared.
  allocate(aspect) {
    const size = (res) => (aspect > 1 ? [Math.round(res * aspect), res] : [res, Math.round(res / aspect)])
    const [sw, sh] = size(this.res.simRes)
    const [dw, dh] = size(this.res.dyeRes)
    for (const t of [this.velocity, this.dye, this.pressure]) { t?.read.dispose(); t?.write.dispose() }
    this.divergenceRT?.dispose()
    this.curlRT?.dispose()
    this.velocity = new DoubleTarget(sw, sh)
    this.dye = new DoubleTarget(dw, dh)
    this.pressure = new DoubleTarget(sw, sh)
    this.divergenceRT = makeTarget(sw, sh)
    this.curlRT = makeTarget(sw, sh)
    this.simTexel.set(1 / sw, 1 / sh)
    this.aspect = aspect
  }

  resize(w, h) {
    const aspect = w / h
    this.mats.splat.uniforms.aspectRatio.value = aspect
    // mobile URL bars resize the viewport constantly; only rebuild on a real shape change
    if (Math.abs(aspect / this.aspect - 1) > 0.15) this.allocate(aspect)
  }

  get dyeTexture() { return this.dye.read.texture }
  get velocityTexture() { return this.velocity.read.texture }

  // x, y in 0..1 (y up). dx, dy are uv deltas. color is a THREE.Color (any intensity).
  splat(x, y, dx, dy, color) {
    this.queue.push({ x, y, dx: dx * this.config.splatForce, dy: dy * this.config.splatForce, color: color.clone() })
  }

  pass(name, uniforms, target) {
    const m = this.mats[name]
    for (const k in uniforms) m.uniforms[k].value = uniforms[k]
    this.quad.material = m
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
  }

  update(dt) {
    const prev = this.renderer.getRenderTarget()
    const c = this.config
    const aspect = this.mats.splat.uniforms.aspectRatio.value
    const radius = c.splatRadius * (aspect > 1 ? aspect : 1)

    for (const s of this.queue) {
      this.pass('splat', { uTarget: this.velocity.read.texture, point: new THREE.Vector2(s.x, s.y), color: new THREE.Vector3(s.dx, s.dy, 0), radius, texelSize: this.simTexel }, this.velocity.write)
      this.velocity.swap()
      this.pass('splat', { uTarget: this.dye.read.texture, color: new THREE.Vector3(s.color.r, s.color.g, s.color.b) }, this.dye.write)
      this.dye.swap()
    }
    this.queue.length = 0

    const vel = this.velocity
    this.pass('curl', { uVelocity: vel.read.texture, texelSize: this.simTexel }, this.curlRT)
    this.pass('vorticity', { uVelocity: vel.read.texture, uCurl: this.curlRT.texture, curl: c.curl, dt }, vel.write)
    vel.swap()
    this.pass('divergence', { uVelocity: vel.read.texture }, this.divergenceRT)
    this.pass('clear', { uTexture: this.pressure.read.texture, value: 0.8 }, this.pressure.write)
    this.pressure.swap()
    for (let i = 0; i < c.pressureIters; i++) {
      this.pass('pressure', { uPressure: this.pressure.read.texture, uDivergence: this.divergenceRT.texture }, this.pressure.write)
      this.pressure.swap()
    }
    this.pass('gradient', { uPressure: this.pressure.read.texture, uVelocity: vel.read.texture }, vel.write)
    vel.swap()

    this.pass('advection', { uVelocity: vel.read.texture, uSource: vel.read.texture, dt, dissipation: c.velocityDissipation, texelSize: this.simTexel }, vel.write)
    vel.swap()
    this.pass('advection', { uVelocity: vel.read.texture, uSource: this.dye.read.texture, dt, dissipation: c.dyeDissipation, texelSize: this.simTexel }, this.dye.write)
    this.dye.swap()

    this.renderer.setRenderTarget(prev)
  }
}
