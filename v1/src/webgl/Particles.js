import * as THREE from 'three'

// v1: single-color GPU points; drift, cursor repulsion, morph into a sphere.
export class Particles {
  constructor({ count = 6000, pixelRatio = 1 } = {}) {
    const field = new Float32Array(count * 3)
    const sphere = new Float32Array(count * 3)
    const rand = new Float32Array(count)
    const golden = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
      field[i * 3 + 0] = (Math.random() - 0.5) * 14
      field[i * 3 + 1] = (Math.random() - 0.5) * 9
      field[i * 3 + 2] = -Math.random() * 8 + 1.5

      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i
      const s = 1.05 + (Math.random() - 0.5) * 0.08
      sphere.set([Math.cos(th) * r * s, y * s, Math.sin(th) * r * s], i * 3)

      rand[i] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(field, 3))
    geometry.setAttribute('aSphere', new THREE.BufferAttribute(sphere, 3))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))

    this.uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) },
      uRepel: { value: 1 },
      uSize: { value: 26 },
      uScale: { value: 1.4 },
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0.4 },
      uCenter: { value: new THREE.Vector3() },
      uPixelRatio: { value: pixelRatio },
    }

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime, uMorph, uRepel, uSize, uScale, uPixelRatio;
        uniform vec3 uMouse, uCenter;
        attribute vec3 aSphere;
        attribute float aRand;
        varying float vAlpha;

        mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

        void main() {
          vec3 f = position;
          f.x += sin(uTime * 0.15 + aRand * 6.283) * 0.35;
          f.y += cos(uTime * 0.2 + aRand * 12.0) * 0.25;

          vec3 s = aSphere * (1.0 + 0.06 * sin(uTime * 2.0 + aRand * 20.0));
          s.xz = rot(uTime * 0.3) * s.xz;
          s = s * uScale + uCenter;

          float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.5 - aRand * 0.5, 0.0, 1.0));
          vec3 p = mix(f, s, m);

          vec2 d = p.xy - uMouse.xy;
          float l = length(d);
          p.xy += (d / max(l, 1e-3)) * smoothstep(1.4, 0.0, l) * 0.6 * uRepel;

          vec4 mv = viewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * uPixelRatio * (0.35 + aRand * 0.9) / -mv.z;
          vAlpha = 0.35 + 0.65 * aRand;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
        }`,
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
  }

  update(state, time, mouseWorld, heroPos) {
    const u = this.uniforms
    u.uTime.value = time
    u.uMorph.value = state.morph
    u.uSize.value = state.pSize
    u.uColor.value.copy(state.pColor)
    u.uOpacity.value = state.pOpacity
    u.uMouse.value.lerp(mouseWorld, 0.15)
    u.uCenter.value.copy(heroPos)
  }
}
