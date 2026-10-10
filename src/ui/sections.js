import gsap from 'gsap'
import { chapters } from '../scroll/chapters.js'

const splitLine = (text) =>
  `<span class="line">${[...text]
    .map((ch) => `<span class="char">${ch === ' ' ? '&nbsp;' : ch}</span>`)
    .join('')}</span>`

function chapterHTML(c, loop) {
  const specs = c.specs
    ? `<dl class="specs mono reveal">${c.specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`
    : ''
  const cta = c.id === 'intro' || c.id === 'deconstruct'
    ? `<button class="btn mono reveal" data-magnetic data-pulse><span class="btn__label">${c.id === 'intro' ? 'Encode ↗' : 'Shatter ↗'}</span></button>`
    : ''
  return `
    <section class="chapter chapter--${c.layout}" data-chapter="${c.id}">
      <div class="chapter__inner">
        <span class="kicker mono">${c.kicker} · L${String(loop).padStart(2, '0')}</span>
        <h2 class="headline">${c.title.map(splitLine).join('')}</h2>
        <p class="lede reveal">${c.lede}</p>
        ${specs}${cta}
      </div>
    </section>`
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

// Reveal headlines letter by letter when a chapter enters the viewport.
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const el = e.target
      el.classList.add('is-in')
      observer.unobserve(el)
      if (reduced) continue
      gsap.fromTo(
        el.querySelectorAll('.char'),
        { yPercent: 115, rotate: 6 },
        { yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.025 }
      )
    }
  },
  { threshold: 0.15 }
)

// One block = one full pass through all chapters.
export function createBlock(loop) {
  const block = document.createElement('div')
  block.className = 'block'
  block.dataset.loop = loop
  block.innerHTML = chapters.map((c) => chapterHTML(c, loop)).join('')
  block.querySelectorAll('.chapter').forEach((s) => observer.observe(s))
  return block
}

export function disposeBlock(block) {
  block.querySelectorAll('.chapter').forEach((s) => observer.unobserve(s))
  block.remove()
}
