import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { HeroObject } from './HeroObject.js'
import { Particles } from './Particles.js'
import { Background } from './Background.js'
import { PostFX } from './PostFX.js'
import { Fluid } from './Fluid.js'
import { palette } from '../scroll/chapters.js'

export class Experience {
  constructor(canvas, { mobile = false, reduced = false } = {}) {
    this.reduced = reduced
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 50)
    this.camera.position.set(0, 0, 6)

    // Procedural studio lighting (no download needed).
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const key = new THREE.DirectionalLight('#ffffff', 1.2)
    key.position.set(3, 4, 5)
    this.scene.add(key)

    this.fluid = reduced ? null : new Fluid(this.renderer, { simRes: mobile ? 96 : 128, dyeRes: mobile ? 384 : 768 })
    this.background = new Background({ reduced })
    this.hero = new HeroObject({ detail: mobile ? 32 : 64 })
    this.particles = new Particles({ count: mobile ? 2500 : 7000, pixelRatio: this.renderer.getPixelRatio() })
    this.scene.add(this.background.mesh, this.particles.points, this.hero.group)

    this.post = new PostFX(this.renderer, this.scene, this.camera, { reduced })

    this.raycaster = new THREE.Raycaster()
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.mouseWorld = new THREE.Vector3()
    this.lookAt = new THREE.Vector3()
    this.splatColor = new THREE.Color()
    this.lastUv = null
    this.blank = new THREE.DataTexture(new Uint8Array(4), 1, 1)
    this.blank.needsUpdate = true

    this.resize()
    addEventListener('resize', () => this.resize())

    // compile the glass variant up front so the first glass chapter doesn't hitch
    this.hero.mesh.material = this.hero.glass
    this.renderer.compile(this.scene, this.camera)
    this.hero.mesh.material = this.hero.material
  }

  resize() {
    const w = innerWidth, h = innerHeight
    this.camera.aspect = w / h
    this.camera.position.z = w / h < 1 ? 8 : 6 // pull back on portrait screens
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.post.setSize(w, h)
    this.background.resize(w, h)
    this.fluid?.resize(w, h)
  }

  // Cursor → fluid: one splat per frame along the movement, colored by the palette.
  feedFluid(state, mouse, time) {
    const uv = { x: mouse.ndc.x * 0.5 + 0.5, y: mouse.ndc.y * 0.5 + 0.5 }
    if (this.lastUv) {
      const dx = uv.x - this.lastUv.x
      const dy = uv.y - this.lastUv.y
      const d2 = dx * dx + dy * dy
      // > 0.15 uv in one frame is a jump (touch tap elsewhere, first move after load), not a stroke
      if (d2 > 1e-7 && d2 < 0.0225) {
        palette(state, time * 0.15 + Math.random() * 0.25, this.splatColor).multiplyScalar(0.35)
        this.fluid.splat(uv.x, uv.y, dx, dy, this.splatColor)
      }
    }
    this.lastUv = uv
  }

  // Radial burst of colored ink around a screen point (used by shatter).
  burst(state, ndc, time) {
    if (!this.fluid) return
    const x = ndc.x * 0.5 + 0.5, y = ndc.y * 0.5 + 0.5
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const c = palette(state, i / 10 + time * 0.1, new THREE.Color()).multiplyScalar(0.9)
      this.fluid.splat(x, y, Math.cos(a) * 0.012, Math.sin(a) * 0.012, c)
    }
  }

  update({ state, mouse, dt, time, progress, scrollVelocity }) {
    // parallax camera
    const c = this.camera
    c.position.x += (mouse.smooth.x * 0.35 - c.position.x) * 0.08
    c.position.y += (mouse.smooth.y * 0.22 - c.position.y) * 0.08
    c.lookAt(this.lookAt)
    c.updateMatrixWorld()

    this.raycaster.setFromCamera(mouse.ndc, c)
    this.raycaster.ray.intersectPlane(this.plane, this.mouseWorld)
    this.hero.raycast(this.raycaster)

    if (this.fluid) {
      this.feedFluid(state, mouse, time)
      this.fluid.update(Math.min(dt, 1 / 30))
    }
    const dye = this.fluid ? this.fluid.dyeTexture : this.blank
    const vel = this.fluid ? this.fluid.velocityTexture : this.blank

    this.hero.update(state, dt, time)
    this.background.update(state, dt, time, mouse.smooth, scrollVelocity, dye)
    this.particles.update(state, time, this.mouseWorld, this.hero.group.position, this.background.travel)
    this.post.update(state, mouse, scrollVelocity, vel, dt)
    this.post.render(dt)
  }
}
