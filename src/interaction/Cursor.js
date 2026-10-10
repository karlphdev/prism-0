import gsap from 'gsap'

// Custom DOM cursor + magnetic pull on [data-magnetic] elements.
export class Cursor {
  constructor(mouse) {
    this.mouse = mouse
    this.dot = document.querySelector('.cursor__dot')
    this.ring = document.querySelector('.cursor__ring')
    this.ringPos = { x: mouse.px.x, y: mouse.px.y }
    this.magnet = null

    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest?.('[data-magnetic]')
      if (el) { this.magnet = el; document.body.classList.add('cursor-link') }
    })
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest?.('[data-magnetic]')
      if (el && !el.contains(e.relatedTarget)) {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
        this.magnet = null
        document.body.classList.remove('cursor-link')
      }
    })
  }

  update() {
    const { x, y } = this.mouse.px
    let tx = x, ty = y

    if (this.magnet) {
      const r = this.magnet.getBoundingClientRect()
      // subtract the current magnetic offset so the pull doesn't feed back on itself
      const cx = r.left + r.width / 2 - gsap.getProperty(this.magnet, 'x')
      const cy = r.top + r.height / 2 - gsap.getProperty(this.magnet, 'y')
      gsap.to(this.magnet, { x: (x - cx) * 0.35, y: (y - cy) * 0.35, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
      tx = cx + (x - cx) * 0.5
      ty = cy + (y - cy) * 0.5
    }

    this.ringPos.x += (tx - this.ringPos.x) * 0.18
    this.ringPos.y += (ty - this.ringPos.y) * 0.18
    this.dot.style.transform = `translate3d(${x}px, ${y}px, 0)`
    this.ring.style.transform = `translate3d(${this.ringPos.x}px, ${this.ringPos.y}px, 0)`
  }
}
