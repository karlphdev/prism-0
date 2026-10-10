import Lenis from 'lenis'
import { chapters, stateFor, lerpState } from './chapters.js'
import { createBlock, disposeBlock } from '../ui/sections.js'

const N = chapters.length
const MAX_BLOCKS = 3

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class InfiniteScroll {
  constructor(container, { reduced = false } = {}) {
    this.container = container
    this.blocks = []
    this.nextLoop = 0
    this.removedChapters = 0 // chapters recycled above; counted (not pixels) so resizes can't skew progress
    this.state = {}
    this.cache = new Map()

    this.lenis = new Lenis({ lerp: reduced ? 1 : 0.085, wheelMultiplier: 0.9, autoRaf: false })

    this.append()
    this.append()

    this.sentinel = document.createElement('div')
    this.sentinel.style.height = '1px'
    container.after(this.sentinel)
    new IntersectionObserver(
      ([e]) => e.isIntersecting && this.append(),
      { rootMargin: '0px 0px 200% 0px' }
    ).observe(this.sentinel)

    this.measure()
    addEventListener('resize', () => this.onResize())
  }

  // Chapter height follows the viewport, so keep the reader at the same chapter
  // position (not the same pixel offset) when the window resizes or the phone rotates.
  onResize() {
    const local = this.progress - this.removedChapters
    const oldH = this.chapterH
    this.measure()
    if (this.chapterH !== oldH && Number.isFinite(local)) {
      this.lenis.resize()
      this.lenis.scrollTo(local * this.chapterH, { immediate: true, force: true })
    }
  }

  measure() {
    const s = this.container.querySelector('.chapter')
    this.chapterH = s ? s.offsetHeight : innerHeight * 1.5
  }

  append() {
    const block = createBlock(this.nextLoop++)
    this.container.appendChild(block)
    this.blocks.push(block)
    this.lenis.resize()
  }

  // Drop the oldest block once it is far above the viewport, and shift scroll
  // by its height in the same frame so nothing visibly moves.
  recycle() {
    if (this.blocks.length <= MAX_BLOCKS) return
    if (Math.abs(this.lenis.velocity) > 0.5) return
    const first = this.blocks[0]
    if (first.getBoundingClientRect().bottom > -innerHeight) return
    const h = first.offsetHeight
    disposeBlock(first)
    this.blocks.shift()
    this.removedChapters += N
    this.lenis.resize()
    this.lenis.scrollTo(this.lenis.scroll - h, { immediate: true, force: true })
  }

  getState(i, loop) {
    const key = `${i}:${loop}`
    let s = this.cache.get(key)
    if (!s) {
      s = stateFor(i, loop)
      this.cache.set(key, s)
      if (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value)
    }
    return s
  }

  update(time) {
    this.lenis.raf(time)
    this.recycle()

    // p = continuous chapter index. Hold each chapter, then ease to the next.
    this.progress = this.removedChapters + this.lenis.scroll / this.chapterH
    const idx = Math.floor(this.progress)
    const f = this.progress - idx
    const t = smooth(0.35, 0.95, f)

    const a = this.getState(idx % N, Math.floor(idx / N))
    const b = this.getState((idx + 1) % N, Math.floor((idx + 1) / N))
    lerpState(a, b, t, this.state)
    this.state.modeA = chapters[idx % N].bg
    this.state.modeB = chapters[(idx + 1) % N].bg
    this.state.modeMix = t

    this.chapterIndex = idx % N
    this.loop = Math.floor(idx / N)
    this.velocity = this.lenis.velocity
    return this.state
  }
}
