import { Vector2 } from 'three'

// Normalized cursor (-1..1, y up), a smoothed copy, and a decaying velocity.
export class Mouse {
  constructor() {
    this.px = new Vector2(innerWidth / 2, innerHeight / 2) // pixels
    this.ndc = new Vector2()
    this.smooth = new Vector2()
    this.velocity = 0
    this._prev = new Vector2()

    addEventListener('pointermove', (e) => {
      this.px.set(e.clientX, e.clientY)
      this.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    }, { passive: true })
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * 8)
    this.smooth.lerp(this.ndc, k)
    const speed = this.ndc.distanceTo(this._prev) / Math.max(dt, 1e-3)
    this._prev.copy(this.ndc)
    // fast attack, slow release
    this.velocity += (Math.min(speed, 12) - this.velocity) * (speed > this.velocity ? 0.35 : 0.06)
  }
}
