import { Color } from 'three'

// v1: flat per-chapter colors, light/dark editorial palette.
export const chapters = [
  {
    id: 'intro',
    layout: 'left',
    kicker: '00 — Intro',
    title: ['Shape of', 'nothing.'],
    lede: 'A test surface for motion, light and touch. Drag the object. Click it. Keep scrolling.',
    bgA: '#ecebe7', bgB: '#d6d3cc', fg: '#111111',
    obj: { color: '#e4e0d8', metalness: 0.05, roughness: 0.18, iridescence: 1.0, x: 1.1, y: 0, scale: 1, amp: 0.12, freq: 1.2, spin: 0.15 },
    particles: { color: '#5c5a55', opacity: 0.35, morph: 0, size: 26 },
    fx: { bloom: 0.25, ca: 0.0, pixel: 0, vignette: 0.25, glow: 0.5 },
  },
  {
    id: 'features',
    layout: 'right',
    kicker: '01 — Features',
    title: ['Built to', 'react.'],
    lede: 'Every vertex listens to the cursor. Velocity bends light, hover bends matter.',
    specs: [['Vertices', '253,440'], ['Noise', 'Simplex 3D'], ['Frame', '16.6 ms'], ['Material', 'Physical']],
    bgA: '#e6e6e8', bgB: '#c9cbd1', fg: '#0e0e10',
    obj: { color: '#c9ccd2', metalness: 1.0, roughness: 0.08, iridescence: 0.3, x: -1.2, y: 0, scale: 1.05, amp: 0.3, freq: 1.6, spin: 0.35 },
    particles: { color: '#3d3f45', opacity: 0.45, morph: 0, size: 30 },
    fx: { bloom: 0.35, ca: 0.0015, pixel: 0, vignette: 0.3, glow: 0.6 },
  },
  {
    id: 'deconstruct',
    layout: 'left',
    kicker: '02 — Deconstruct',
    title: ['Break it', 'apart.'],
    lede: 'Resolution is a choice. Push the noise until the form forgets itself.',
    bgA: '#141416', bgB: '#050506', fg: '#f2f1ee',
    obj: { color: '#ff4d1a', metalness: 0.2, roughness: 0.35, iridescence: 0.0, x: 1.25, y: 0, scale: 0.85, amp: 0.45, freq: 2.2, spin: 0.6 },
    particles: { color: '#ff7a4d', opacity: 0.7, morph: 0, size: 34 },
    fx: { bloom: 0.9, ca: 0.004, pixel: 7, vignette: 0.55, glow: 0.35 },
  },
  {
    id: 'particles',
    layout: 'center',
    kicker: '03 — Particles',
    title: ['Become', 'dust.'],
    lede: 'Matter is just a decision particles make together.',
    bgA: '#08080b', bgB: '#000000', fg: '#f2f1ee',
    obj: { color: '#ffffff', metalness: 0.0, roughness: 0.5, iridescence: 0.0, x: 0, y: 0.35, scale: 0.0, amp: 0.4, freq: 1.5, spin: 0.2 },
    particles: { color: '#e9ecff', opacity: 1.0, morph: 1, size: 44 },
    fx: { bloom: 1.4, ca: 0.002, pixel: 0, vignette: 0.6, glow: 0.2 },
  },
  {
    id: 'outro',
    layout: 'right',
    kicker: '04 — Outro',
    title: ['And', 'again.'],
    lede: 'There is no end. Every loop drifts a little further from where it started.',
    bgA: '#efe9df', bgB: '#d8cdbb', fg: '#14110d',
    obj: { color: '#151515', metalness: 0.4, roughness: 0.12, iridescence: 0.6, x: -1.0, y: 0, scale: 1.2, amp: 0.18, freq: 1.0, spin: 0.25 },
    particles: { color: '#5b4f3e', opacity: 0.4, morph: 0, size: 28 },
    fx: { bloom: 0.3, ca: 0.001, pixel: 0, vignette: 0.3, glow: 0.55 },
  },
]

const tmp = { h: 0, s: 0, l: 0 }

// Loops drift: hue rotates, distortion and frequency creep up.
export function stateFor(i, loop) {
  const c = chapters[i]
  const drift = Math.min(loop, 8)
  const hue = (loop * 0.11) % 1

  const shift = (hex, sat = 0) => {
    const col = new Color(hex)
    if (loop === 0) return col
    col.getHSL(tmp)
    return col.setHSL((tmp.h + hue) % 1, Math.min(1, tmp.s + sat * drift), tmp.l)
  }

  return {
    bgA: shift(c.bgA, 0.03),
    bgB: shift(c.bgB, 0.03),
    fg: new Color(c.fg),
    objColor: shift(c.obj.color, 0.08),
    metalness: c.obj.metalness,
    roughness: c.obj.roughness,
    iridescence: c.obj.iridescence,
    x: c.obj.x,
    y: c.obj.y,
    scale: c.obj.scale,
    amp: c.obj.amp * (1 + drift * 0.06),
    freq: c.obj.freq * (1 + drift * 0.08),
    spin: c.obj.spin,
    pColor: shift(c.particles.color, 0.05),
    pOpacity: c.particles.opacity,
    morph: c.particles.morph,
    pSize: c.particles.size * (1 + drift * 0.06),
    bloom: c.fx.bloom,
    ca: c.fx.ca * (1 + drift * 0.25),
    pixel: c.fx.pixel,
    vignette: c.fx.vignette,
    glow: c.fx.glow,
  }
}

export function lerpState(a, b, t, out = {}) {
  for (const k in a) {
    if (a[k] instanceof Color) {
      out[k] = (out[k] instanceof Color ? out[k] : new Color()).copy(a[k]).lerp(b[k], t)
    } else {
      out[k] = a[k] + (b[k] - a[k]) * t
    }
  }
  return out
}
