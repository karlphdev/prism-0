import * as THREE from 'three'
import gsap from 'gsap'
import { snoise } from './noise.glsl.js'

// The protagonist: a noise-displaced sphere with a physical material.
// Hover bulges/ripples the surface under the cursor, drag rotates with inertia,
// click shatters it into triangles that snap back.
export class HeroObject {
  constructor({ detail = 64 } = {}) {
    this.group = new THREE.Group()

    const geometry = new THREE.IcosahedronGeometry(1, detail) // non-indexed: every triangle owns its vertices
    this.addFaceData(geometry)

    this.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.15 },
      uFreq: { value: 1.2 },
      uHit: { value: new THREE.Vector3(0, 0, 1) },
      uHover: { value: 0 },
      uPulse: { value: 0 },
    }

    this.material = new THREE.MeshPhysicalMaterial({
      color: '#e4e0d8',
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      iridescence: 1,
      iridescenceIOR: 1.6,
      envMapIntensity: 1.1,
    })
    this.material.onBeforeCompile = (shader) => this.patchShader(shader)


    this.mesh = new THREE.Mesh(geometry, this.material)
    this.group.add(this.mesh)

    // interaction state
    this.rot = new THREE.Vector2()     // drag rotation (x: pitch, y: yaw)
    this.rotVel = new THREE.Vector2()
    this.spin = 0
    this.hovering = false
    this.dragging = false
    this.hitTarget = new THREE.Vector3(0, 0, 1)
    this.boundSphere = new THREE.Sphere()
  }

  addFaceData(geometry) {
    const pos = geometry.attributes.position
    const center = new Float32Array(pos.count * 3)
    const rand = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
      const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
      const r = Math.random()
      for (let k = 0; k < 3; k++) {
        center.set([cx, cy, cz], (i + k) * 3)
        rand[i + k] = r
      }
    }
    geometry.setAttribute('aCenter', new THREE.BufferAttribute(center, 3))
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
  }

  patchShader(shader) {
    Object.assign(shader.uniforms, this.uniforms)

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uTime, uAmp, uFreq, uHover, uPulse;
        uniform vec3 uHit;
        attribute vec3 aCenter;
        attribute float aRand;
        varying float vDisp;
        ${snoise}

        float field(vec3 p) {
          float n = snoise(p * uFreq + vec3(0.0, uTime * 0.25, uTime * 0.15)) * uAmp;
          n += snoise(p * uFreq * 2.3 - uTime * 0.2) * uAmp * 0.25;
          float d = distance(normalize(p), uHit);
          float bulge = exp(-d * d * 7.0) * 0.32;
          float ripple = sin(d * 22.0 - uTime * 7.0) * 0.025 * exp(-d * 2.5);
          return n + uHover * (bulge + ripple);
        }
        vec3 disp(vec3 p) { return p + normalize(p) * field(p); }`
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 nrm = normalize(position);
        vec3 tng = normalize(cross(nrm, abs(nrm.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
        vec3 btg = cross(nrm, tng);
        const float e = 0.008;
        float fd = field(position);
        vec3 dp = position + nrm * fd;
        vec3 pa = disp(normalize(position + tng * e));
        vec3 pb = disp(normalize(position + btg * e));
        vec3 objectNormal = normalize(cross(pa - dp, pb - dp));
        vDisp = fd;`
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        vec3 transformed = dp;
        // shatter: push each triangle out along its centroid, with a little spin-off
        float shard = uPulse * (0.6 + aRand * 1.4);
        transformed += normalize(aCenter) * shard * 1.2;
        transformed += (aCenter - position) * min(shard * 0.4, 0.9); // shrink shards`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDisp;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        diffuseColor.rgb *= 0.85 + vDisp * 0.6;`
      )
  }

  // --- interaction -------------------------------------------------------

  raycast(raycaster) {
    this.boundSphere.center.copy(this.group.position)
    this.boundSphere.radius = this.group.scale.x * (1 + this.uniforms.uAmp.value * 0.6)
    if (this.group.scale.x < 0.15) return (this.hovering = false)
    const hit = raycaster.ray.intersectSphere(this.boundSphere, new THREE.Vector3())
    this.hovering = !!hit
    if (hit) this.hitTarget.copy(this.mesh.worldToLocal(hit)).normalize()
    return this.hovering
  }

  // dx/dy in NDC since last pointer event, dt in seconds since last event
  drag(dx, dy, dt) {
    this.rot.y += dx * 3
    this.rot.x -= dy * 3
    this.rotVel.set((-dy * 3) / dt, (dx * 3) / dt).clampLength(0, 12)
  }

  pulse() {
    gsap.killTweensOf(this.uniforms.uPulse)
    gsap.fromTo(this.uniforms.uPulse, { value: 0 }, {
      keyframes: [
        { value: 1, duration: 0.35, ease: 'expo.out' },
        { value: 0, duration: 1.6, ease: 'elastic.out(1, 0.35)' },
      ],
    })
  }

  // --- per frame ---------------------------------------------------------

  update(state, dt, time) {
    const u = this.uniforms
    u.uTime.value = time
    u.uAmp.value = state.amp
    u.uFreq.value = state.freq
    u.uHover.value += ((this.hovering ? 1 : 0) - u.uHover.value) * (1 - Math.exp(-dt * 6))
    u.uHit.value.lerp(this.hitTarget, 1 - Math.exp(-dt * 10)).normalize()

    const m = this.material
    m.color.copy(state.objColor)
    m.metalness = state.metalness
    m.roughness = state.roughness
    // never exactly 0: crossing 0 toggles a shader define and forces a recompile (hitch)
    m.iridescence = Math.max(state.iridescence, 0.001)

    const narrow = innerWidth / innerHeight < 1
    this.group.position.set(state.x * (narrow ? 0.15 : 1), state.y + (narrow ? 0.45 : 0), 0)
    this.group.scale.setScalar(Math.max(state.scale * (narrow ? 0.72 : 1), 0.0001))
    this.group.visible = state.scale > 0.01

    // inertia: drag velocity decays, auto-spin keeps it alive
    if (this.dragging) {
      // holding still mid-drag bleeds off velocity, so releasing doesn't fling
      this.rotVel.multiplyScalar(Math.exp(-dt * 12))
    } else {
      this.rotVel.multiplyScalar(Math.exp(-dt * 2.5))
      this.rot.x += this.rotVel.x * dt
      this.rot.y += this.rotVel.y * dt
      this.rot.x *= Math.exp(-dt * 0.8) // drift back to upright
    }
    this.rot.x = THREE.MathUtils.clamp(this.rot.x, -1.2, 1.2)
    this.spin += state.spin * dt
    this.mesh.rotation.set(this.rot.x, this.rot.y + this.spin, 0)
  }
}
