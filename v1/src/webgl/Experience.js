import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { HeroObject } from './HeroObject.js'
import { Particles } from './Particles.js'
import { Background } from './Background.js'
import { PostFX } from './PostFX.js'

export class Experience {
  constructor(canvas, { mobile = false, reduced = false } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2))

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 50)
    this.camera.position.set(0, 0, 6)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const key = new THREE.DirectionalLight('#ffffff', 1.2)
    key.position.set(3, 4, 5)
    this.scene.add(key)

    this.background = new Background()
    this.hero = new HeroObject({ detail: mobile ? 32 : 64 })
    this.particles = new Particles({ count: mobile ? 2500 : 7000, pixelRatio: this.renderer.getPixelRatio() })
    this.scene.add(this.background.mesh, this.particles.points, this.hero.group)

    this.post = new PostFX(this.renderer, this.scene, this.camera, { reduced })

    this.raycaster = new THREE.Raycaster()
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.mouseWorld = new THREE.Vector3()
    this.lookAt = new THREE.Vector3()

    this.resize()
    addEventListener('resize', () => this.resize())
  }

  resize() {
    const w = innerWidth, h = innerHeight
    this.camera.aspect = w / h
    this.camera.position.z = w / h < 1 ? 8 : 6
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.post.setSize(w, h)
    this.background.resize(w, h)
  }

  update({ state, mouse, dt, time, progress, scrollVelocity }) {
    const c = this.camera
    c.position.x += (mouse.smooth.x * 0.35 - c.position.x) * 0.08
    c.position.y += (mouse.smooth.y * 0.22 - c.position.y) * 0.08
    c.lookAt(this.lookAt)
    c.updateMatrixWorld()

    this.raycaster.setFromCamera(mouse.ndc, c)
    this.raycaster.ray.intersectPlane(this.plane, this.mouseWorld)
    this.hero.raycast(this.raycaster)

    this.hero.update(state, dt, time)
    this.particles.update(state, time, this.mouseWorld, this.hero.group.position)
    this.background.update(state, time, mouse.smooth, progress)
    this.post.update(state, mouse, scrollVelocity)
    this.post.render(dt)
  }
}
