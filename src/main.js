import gsap from 'gsap'
import { Experience } from './webgl/Experience.js'
import { InfiniteScroll } from './scroll/InfiniteScroll.js'
import { Mouse } from './interaction/Mouse.js'
import { Cursor } from './interaction/Cursor.js'
import { chapters } from './scroll/chapters.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const mobile = matchMedia('(hover: none)').matches || innerWidth < 760

const mouse = new Mouse()
const cursor = new Cursor(mouse)
const scroll = new InfiniteScroll(document.getElementById('content'), { reduced })
const exp = new Experience(document.getElementById('webgl'), { mobile, reduced })
const hero = exp.hero

// --- object interaction: drag to rotate, click to shatter --------------------
let down = null
let last = { x: 0, y: 0, t: 0 }

addEventListener('pointerdown', (e) => {
  if (!hero.hovering || e.target.closest('a, button')) return
  down = { x: e.clientX, y: e.clientY }
  e.target.setPointerCapture?.(e.pointerId) // keep receiving pointerup even outside the window
  last = { x: mouse.ndc.x, y: mouse.ndc.y, t: performance.now() }
  hero.dragging = true
  document.body.classList.add('cursor-drag')
  scroll.lenis.stop() // don't scroll while grabbing the object (touch)
})

addEventListener('pointermove', () => {
  if (!hero.dragging) return
  const now = performance.now()
  hero.drag(mouse.ndc.x - last.x, mouse.ndc.y - last.y, Math.max((now - last.t) / 1000, 1 / 120))
  last = { x: mouse.ndc.x, y: mouse.ndc.y, t: now }
})

function endDrag() {
  down = null
  hero.dragging = false
  document.body.classList.remove('cursor-drag')
  scroll.lenis.start()
}

addEventListener('pointerup', (e) => {
  if (!down) return
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
  if (moved < 6) shatter()
  endDrag()
})
// the browser can take over a touch (pan/zoom) or the window can lose focus mid-drag:
// no pointerup arrives, so release here or scrolling stays locked
addEventListener('pointercancel', () => down && endDrag())
addEventListener('blur', () => down && endDrag())

let lastState = null
let clock = 0

function shatter() {
  hero.pulse()
  gsap.fromTo(exp.post, { kick: 1 }, { kick: 0, duration: 0.9, ease: 'power3.out' })
  if (lastState && hero.group.visible) {
    // ink burst from the object's on-screen position
    const p = hero.group.position.clone().project(exp.camera)
    exp.burst(lastState, p, clock)
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-pulse]')) { e.preventDefault(); shatter() }
  if (e.target.closest('[data-top]')) { e.preventDefault(); scroll.lenis.scrollTo(0, { duration: 2.2 }) }
})

// --- HUD ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id)
const hud = { pct: $('scroll-pct'), loop: $('loop'), fps: $('fps'), mx: $('mx'), my: $('my'), issue: $('issue'), chapter: $('chapter-label') }
const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(2)
let fpsAcc = 0, fpsFrames = 0, lastChapter = -1, lastLoop = -1

function updateHUD(dt, state) {
  fpsAcc += dt; fpsFrames++
  if (fpsAcc > 0.5) { hud.fps.textContent = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0 }

  const pct = ((scroll.progress % chapters.length) / chapters.length) * 100
  hud.pct.textContent = String(Math.floor(pct)).padStart(3, '0')
  hud.mx.textContent = fmt(mouse.smooth.x)
  hud.my.textContent = fmt(mouse.smooth.y)

  if (scroll.chapterIndex !== lastChapter) {
    lastChapter = scroll.chapterIndex
    hud.chapter.textContent = chapters[lastChapter].kicker.toUpperCase()
  }
  if (scroll.loop !== lastLoop) {
    lastLoop = scroll.loop
    hud.loop.textContent = String(lastLoop).padStart(2, '0')
    hud.issue.textContent = String(124 + lastLoop).padStart(5, '0')
  }

  // DOM text color follows the scene palette
  const root = document.documentElement.style
  root.setProperty('--fg', `#${state.fg.getHexString()}`)
  const [r, g, b] = state.fg.toArray().map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255))
  root.setProperty('--muted', `rgba(${r},${g},${b},0.7)`)
  document.body.classList.toggle('fg-light', r + g + b > 382)

  document.body.classList.toggle('cursor-hover', hero.hovering && !hero.dragging)
}

const debug = { mode: -1 }

// --- loop --------------------------------------------------------------------
gsap.ticker.lagSmoothing(0)
gsap.ticker.add((time, deltaMs) => {
  const dt = Math.min(deltaMs / 1000, 0.05)
  mouse.update(dt)
  const state = scroll.update(time * 1000)
  if (debug.mode >= 0) { state.modeA = state.modeB = debug.mode; state.modeMix = 0 }
  lastState = state
  clock = time
  exp.update({ state, mouse, dt, time, progress: scroll.progress, scrollVelocity: scroll.velocity })
  cursor.update()
  updateHUD(dt, state)
})

// --- debug: open with #debug -------------------------------------------------
if (location.hash === '#debug') {
  import('lil-gui').then(({ default: GUI }) => {
    const gui = new GUI({ title: 'playground' })
    gui.add(debug, 'mode', { auto: -1, mesh: 0, fluted: 1, moire: 2, tunnel: 3, drift: 4 }).name('background')
    gui.add(exp.post.noise.blendMode.opacity, 'value', 0, 1).name('grain')
    gui.add(exp.post, 'strengthMul', 0, 4).name('fluid refraction')
    gui.add(exp.particles.uniforms.uRepel, 'value', 0, 4).name('cursor repel')
    if (exp.fluid) {
      const f = gui.addFolder('fluid')
      f.add(exp.fluid.config, 'curl', 0, 60)
      f.add(exp.fluid.config, 'splatRadius', 0.0005, 0.01)
      f.add(exp.fluid.config, 'dyeDissipation', 0, 4)
      f.add(exp.fluid.config, 'velocityDissipation', 0, 4)
    }
    gui.add({ shatter }, 'shatter')
    gui.add(scroll, 'loop').listen().disable()
  })
}
